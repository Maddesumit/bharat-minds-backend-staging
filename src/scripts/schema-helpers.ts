/**
 * Schema Setup Helpers
 * 
 * Utility functions for creating collections, attributes, and indexes
 */

import { Databases, IndexType } from 'node-appwrite';

export async function createCollectionSafe(
    databases: Databases,
    databaseId: string,
    collectionId: string,
    collectionName: string,
    permissions: string[] = []
) {
    try {
        console.log(`\n Creating collection: ${collectionName}...`);

        const collection = await databases.createCollection(
            databaseId,
            collectionId,
            collectionName,
            permissions
        );

        console.log(`Created: ${collectionName}`);
        return collection;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(` Collection already exists: ${collectionName}`);
            return null;
        }
        console.error(`Error creating ${collectionName}:`, error.message);
        throw error;
    }
}

export async function createAttributeSafe(
    databases: Databases,
    databaseId: string,
    collectionId: string,
    attributeKey: string,
    type: 'string' | 'integer' | 'boolean' | 'datetime' | 'email',
    size: number | undefined,
    required: boolean,
    defaultValue?: any,
    array: boolean = false
) {
    try {
        let attribute;

        // Appwrite doesn't allow default values on required attributes  
        const useDefault = required ? undefined : defaultValue;

        switch (type) {
            case 'string':
            case 'email':
                attribute = await databases.createStringAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    size || 255,
                    required,
                    useDefault,
                    array
                );
                break;

            case 'integer':
                attribute = await databases.createIntegerAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    required,
                    undefined,
                    undefined,
                    useDefault,
                    array
                );
                break;

            case 'boolean':
                attribute = await databases.createBooleanAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    required,
                    useDefault,
                    array
                );
                break;

            case 'datetime':
                attribute = await databases.createDatetimeAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    required,
                    useDefault,
                    array
                );
                break;
        }

        console.log(`  ✓ ${attributeKey} (${type}${array ? '[]' : ''})${required ? ' [required]' : ''}`);
        return attribute;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`   Attribute exists: ${attributeKey}`);
            return null;
        }
        console.error(`  Error creating ${attributeKey}:`, error.message);
        throw error;
    }
}

export async function createIndexSafe(
    databases: Databases,
    databaseId: string,
    collectionId: string,
    key: string,
    type: IndexType,
    attributes: string[],
    orders: string[] = []
) {
    try {
        const index = await databases.createIndex(
            databaseId,
            collectionId,
            key,
            type,
            attributes,
            orders.length > 0 ? orders : undefined
        );

        console.log(`  🔍 Index: ${key} on [${attributes.join(', ')}]`);
        return index;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`    Index exists: ${key}`);
            return null;
        }
        console.error(`  Error creating index ${key}:`, error.message);
        throw error;
    }
}

export async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
