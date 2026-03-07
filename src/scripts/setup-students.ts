import dotenv from 'dotenv';
import { databases, config } from '../config/appwrite.config';
import { setupStudents } from './schema-collections/students';

dotenv.config();

async function main() {
    console.log('👨‍🎓 Setting up Students collection...');
    await setupStudents(databases, config.databaseId);
    console.log('✅ Students collection setup complete:', config.collections.students);
}

main().catch((err) => {
    console.error('❌ Failed to setup Students collection:', err?.message || err);
    process.exit(1);
});

