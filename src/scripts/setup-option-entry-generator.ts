import dotenv from 'dotenv';
import { databases, config } from '../config/appwrite.config';
import { setupOptionEntryGenerator } from './schema-collections/option-entry-generator';

dotenv.config();

async function main() {
    console.log('📝 Setting up option-entry generator collection...');
    await setupOptionEntryGenerator(databases, config.databaseId);
    console.log('✅ Collection setup complete:', config.collections.optionEntryGenerator);
}

main().catch((err) => {
    console.error('❌ Failed to setup option-entry generator collection:', err?.message || err);
    process.exit(1);
});

