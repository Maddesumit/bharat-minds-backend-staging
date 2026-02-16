
import { databases, config } from '../config/appwrite.config';

async function testConnection() {
    console.log("Testing connection...");
    try {
        const db = await databases.get(config.databaseId);
        console.log("✅ Database found:", db.$id);

        try {
            const cols = await databases.listCollections(config.databaseId);
            console.log("📂 Collections found:");
            cols.collections.forEach(c => console.log(`   - ${c.name} (${c.$id})`));

            const col = await databases.getCollection(config.databaseId, "farm_agri_v2");
            console.log("✅ Collection 'farm_agri_v2' found:", col.$id);
            // console.log("   Attributes:");
            // col.attributes.forEach((a: any) => {
            //    console.log(`     - ${a.key}: ${a.type} (required: ${a.required}, array: ${a.array})`);
            // });
            console.log("Attributes Count:", col.attributes.length);
            // console.log("Attributes JSON:", JSON.stringify(col.attributes, (k, v) => {
            //     if (k === '$id' || k === '$createdAt' || k === '$updatedAt') return undefined; // simplify
            //     return v;
            // }, 2));
            console.log("Attributes List:", col.attributes.map((a: any) => a.key).join(", "));

            // Check Documents
            const docs = await databases.listDocuments(config.databaseId, "farm_agri_v2", [
                // limit 1
            ]);
            console.log(`\n📚 Total Documents: ${docs.total}`);
            if (docs.documents.length > 0) {
                console.log("Sample Document:", JSON.stringify(docs.documents[0], null, 2));
            } else {
                console.log("⚠️ No documents found.");
            }
        } catch (e: any) {
            console.error("❌ Collection check failed:", e.message);
        }

    } catch (e: any) {
        console.error("❌ Connection failed:", e.message);
    }
}

testConnection();
