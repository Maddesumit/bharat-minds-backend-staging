import { databases, config } from '../config/appwrite.config';
import { Query } from 'node-appwrite';

const docs = await databases.listDocuments(
    config.databaseId,
    config.collections.colleges,
    [Query.equal('city', 'Bangalore')]
);