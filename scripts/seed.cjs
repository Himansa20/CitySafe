/**
 * CitySignal Database Seed Script
 * 
 * Run this script to populate your Firebase database with realistic test data.
 * 
 * Usage:
 *   1. Make sure you have firebase-admin installed: npm install firebase-admin
 *   2. Download your Firebase service account key from Firebase Console
 *   3. Set the path to your service account key below OR set GOOGLE_APPLICATION_CREDENTIALS env var
 *   4. Run: node scripts/seed.js
 * 
 * This will seed:
 *   - 50+ signals across 6 categories
 *   - 8 admin routes (safe corridors and danger zones)
 *   - 6 help requests
 *   - 5 waste zones
 */

const admin = require("firebase-admin");
const path = require("path");

// ============================================
// CONFIGURATION - UPDATE THIS
// ============================================

// Path to your service account key JSON (download from Firebase Console)
// Looks in parent directory (web folder)
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "..", "serviceAccountKey.json");

// Option 2: Or set these environment variables:
// GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
// FIREBASE_PROJECT_ID=your-project-id

// Colombo city center coordinates
const COLOMBO_CENTER = { lat: 6.9271, lng: 79.8612 };

// ============================================
// INITIALIZE FIREBASE
// ============================================

let serviceAccount;
try {
    serviceAccount = require(SERVICE_ACCOUNT_PATH);
    console.log(`✓ Found service account key at: ${SERVICE_ACCOUNT_PATH}`);
} catch (e) {
    console.error(`✗ Could not load service account key from: ${SERVICE_ACCOUNT_PATH}`);
    console.error(`  Make sure serviceAccountKey.json exists in the web folder`);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomLatLng(center, radiusKm = 3) {
    // Generate random point within radius of center
    const radiusInDeg = radiusKm / 111; // roughly 111km per degree
    return {
        lat: center.lat + randomInRange(-radiusInDeg, radiusInDeg),
        lng: center.lng + randomInRange(-radiusInDeg, radiusInDeg)
    };
}

function daysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return admin.firestore.Timestamp.fromDate(date);
}

// ============================================
// SEED DATA DEFINITIONS
// ============================================

const CATEGORIES = ["waste", "safety", "transport", "flooding", "accessibility", "public_space"];
const AFFECTED_GROUPS = ["women", "children", "elderly", "disabled", "low_income"];
const STATUSES = ["new", "acknowledged", "in_progress", "resolved"];

// Realistic signal descriptions per category
const SIGNAL_TEMPLATES = {
    waste: [
        { desc: "Overflowing garbage bins near the bus stop", severity: 4 },
        { desc: "Illegal dumping of construction debris", severity: 5 },
        { desc: "Uncollected household waste for 3 days", severity: 3 },
        { desc: "Broken public waste bin needs replacement", severity: 2 },
        { desc: "Foul smell from drainage near market area", severity: 4 },
        { desc: "Plastic waste accumulating in canal", severity: 5 },
        { desc: "Street sweeping needed on main road", severity: 2 },
        { desc: "Hazardous medical waste found near hospital", severity: 5 },
    ],
    safety: [
        { desc: "Broken street light creating dark spot", severity: 5 },
        { desc: "Suspicious activity reported at night", severity: 4 },
        { desc: "Stray dogs aggressive near school", severity: 4 },
        { desc: "Missing manhole cover on sidewalk", severity: 5 },
        { desc: "Drug activity observed in park after dark", severity: 5 },
        { desc: "Vandalism to public property", severity: 3 },
        { desc: "Exposed electrical wires near playground", severity: 5 },
        { desc: "Pickpocket incidents at crowded junction", severity: 4 },
    ],
    transport: [
        { desc: "Pothole causing vehicle damage", severity: 4 },
        { desc: "Traffic light not working at intersection", severity: 5 },
        { desc: "Bus stop shelter damaged by storm", severity: 3 },
        { desc: "Faded road markings causing confusion", severity: 3 },
        { desc: "Illegal parking blocking pedestrian path", severity: 4 },
        { desc: "Speed limit sign missing on school zone", severity: 5 },
        { desc: "Footpath too narrow for pedestrians", severity: 3 },
        { desc: "No pedestrian crossing near busy area", severity: 4 },
    ],
    flooding: [
        { desc: "Street floods during light rain", severity: 4 },
        { desc: "Clogged storm drain causing backup", severity: 5 },
        { desc: "Low-lying area prone to waterlogging", severity: 4 },
        { desc: "Broken culvert needs urgent repair", severity: 5 },
        { desc: "Standing water attracting mosquitoes", severity: 3 },
        { desc: "Overflowing canal during monsoon", severity: 5 },
    ],
    accessibility: [
        { desc: "No wheelchair ramp at public building", severity: 4 },
        { desc: "Tactile paving damaged on crosswalk", severity: 4 },
        { desc: "Steep incline without handrails", severity: 5 },
        { desc: "Narrow doorway at government office", severity: 3 },
        { desc: "No audio signals at traffic light", severity: 4 },
        { desc: "Public toilet not accessible", severity: 4 },
    ],
    public_space: [
        { desc: "Park benches broken and unusable", severity: 2 },
        { desc: "Graffiti on historical monument", severity: 3 },
        { desc: "Playground equipment needs repair", severity: 4 },
        { desc: "Public fountain not working", severity: 2 },
        { desc: "Overgrown vegetation blocking path", severity: 3 },
        { desc: "Lack of shade in public square", severity: 2 },
        { desc: "No public toilets in busy area", severity: 4 },
    ],
};

// Safe and Unsafe route data
const ADMIN_ROUTES = [
    // Safe corridors
    {
        type: "safe",
        name: "Galle Road Safe Corridor",
        description: "Well-lit main road with police presence. [Safety Rating: 5/5]",
        points: [
            { lat: 6.9271, lng: 79.8442 },
            { lat: 6.9211, lng: 79.8485 },
            { lat: 6.9151, lng: 79.8532 },
            { lat: 6.9091, lng: 79.8575 },
        ]
    },
    {
        type: "safe",
        name: "Fort Railway Station Route",
        description: "High foot traffic, CCTV monitored. [Safety Rating: 4/5]",
        points: [
            { lat: 6.9344, lng: 79.8428 },
            { lat: 6.9356, lng: 79.8460 },
            { lat: 6.9368, lng: 79.8498 },
        ]
    },
    {
        type: "safe",
        name: "Independence Avenue Stretch",
        description: "Wide boulevard with regular patrols. [Safety Rating: 5/5]",
        points: [
            { lat: 6.9022, lng: 79.8642 },
            { lat: 6.9022, lng: 79.8702 },
            { lat: 6.9022, lng: 79.8762 },
            { lat: 6.9022, lng: 79.8822 },
        ]
    },
    {
        type: "safe",
        name: "Hospital Road Safe Path",
        description: "Near medical facilities, always busy. [Safety Rating: 4/5]",
        points: [
            { lat: 6.9180, lng: 79.8690 },
            { lat: 6.9200, lng: 79.8720 },
            { lat: 6.9220, lng: 79.8750 },
        ]
    },
    // Danger zones
    {
        type: "unsafe",
        name: "Dark Alley Near Market",
        description: "Poorly lit, reported thefts. Avoid at night. [Safety Rating: 1/5]",
        points: [
            { lat: 6.9375, lng: 79.8520 },
            { lat: 6.9385, lng: 79.8540 },
            { lat: 6.9395, lng: 79.8555 },
        ]
    },
    {
        type: "unsafe",
        name: "Industrial Zone Access Road",
        description: "No street lights, isolated area. [Safety Rating: 2/5]",
        points: [
            { lat: 6.9450, lng: 79.8750 },
            { lat: 6.9480, lng: 79.8780 },
            { lat: 6.9510, lng: 79.8810 },
            { lat: 6.9540, lng: 79.8840 },
        ]
    },
    {
        type: "unsafe",
        name: "Abandoned Railway Crossing",
        description: "Known for illegal activities after dark. [Safety Rating: 1/5]",
        points: [
            { lat: 6.9130, lng: 79.8420 },
            { lat: 6.9145, lng: 79.8405 },
        ]
    },
    {
        type: "unsafe",
        name: "Construction Site Perimeter",
        description: "Unsafe footing, no lighting. [Safety Rating: 2/5]",
        points: [
            { lat: 6.9250, lng: 79.8900 },
            { lat: 6.9260, lng: 79.8920 },
            { lat: 6.9270, lng: 79.8940 },
        ]
    },
];

// Help requests
const HELP_REQUESTS = [
    {
        title: "Volunteers Needed for Canal Cleanup",
        type: "volunteer",
        description: "Weekly canal cleanup drive near Dematagoda. Need 20 volunteers for this Saturday.",
        orgName: "Green Colombo Initiative",
        status: "open",
        lat: 6.9350,
        lng: 79.8750,
    },
    {
        title: "Flood Relief Distribution Help",
        type: "volunteer",
        description: "Help distribute relief supplies to affected families in Kolonnawa area.",
        orgName: "Red Cross Sri Lanka",
        status: "open",
        lat: 6.9220,
        lng: 79.8880,
    },
    {
        title: "Elderly Care - Daily Check-ins",
        type: "care",
        description: "Looking for volunteers to make daily check-in calls to elderly residents living alone.",
        orgName: "Senior Citizens Association",
        status: "open",
        lat: 6.9100,
        lng: 79.8650,
    },
    {
        title: "School Crossing Guards Needed",
        type: "volunteer",
        description: "Help ensure safe school crossings during morning and evening hours.",
        orgName: "Parent Teacher Association",
        status: "open",
        lat: 6.9180,
        lng: 79.8520,
    },
    {
        title: "Street Light Survey Assistants",
        type: "survey",
        description: "Assist in documenting non-functional street lights across Ward 5.",
        orgName: "Municipal Council",
        status: "open",
        lat: 6.9271,
        lng: 79.8612,
    },
    {
        title: "Tree Planting Drive",
        type: "volunteer",
        description: "Join us to plant 100 trees along the canal bank. Equipment provided.",
        orgName: "Urban Greening Project",
        status: "closed",
        lat: 6.9400,
        lng: 79.8700,
    },
];

// Waste zones
const WASTE_ZONES = [
    {
        name: "Fort Commercial Zone",
        description: "High-density commercial area with daily collection",
        bounds: {
            north: 6.9400,
            south: 6.9300,
            east: 79.8550,
            west: 79.8400,
        },
        schedule: {
            monday: "06:00",
            wednesday: "06:00",
            friday: "06:00",
        },
        type: "commercial",
    },
    {
        name: "Kollupitiya Residential",
        description: "Residential area with thrice-weekly pickup",
        bounds: {
            north: 6.9200,
            south: 6.9050,
            east: 79.8600,
            west: 79.8450,
        },
        schedule: {
            tuesday: "07:00",
            thursday: "07:00",
            saturday: "07:00",
        },
        type: "residential",
    },
    {
        name: "Pettah Market District",
        description: "Daily collection required due to market waste",
        bounds: {
            north: 6.9380,
            south: 6.9320,
            east: 79.8550,
            west: 79.8480,
        },
        schedule: {
            monday: "05:00",
            tuesday: "05:00",
            wednesday: "05:00",
            thursday: "05:00",
            friday: "05:00",
            saturday: "05:00",
            sunday: "05:00",
        },
        type: "market",
    },
    {
        name: "Bambalapitiya Mixed Zone",
        description: "Mixed residential and commercial",
        bounds: {
            north: 6.8950,
            south: 6.8850,
            east: 79.8580,
            west: 79.8500,
        },
        schedule: {
            monday: "06:30",
            wednesday: "06:30",
            friday: "06:30",
            sunday: "08:00",
        },
        type: "mixed",
    },
    {
        name: "Dematagoda Industrial",
        description: "Industrial waste zone with special handling",
        bounds: {
            north: 6.9550,
            south: 6.9450,
            east: 79.8900,
            west: 79.8800,
        },
        schedule: {
            tuesday: "14:00",
            friday: "14:00",
        },
        type: "industrial",
    },
];

// Safe places (police stations, hospitals, etc.)
const SAFE_PLACES = [
    {
        name: "Colombo Police Headquarters",
        type: "police",
        lat: 6.9319,
        lng: 79.8478,
        address: "Galle Road, Colombo 03",
        phone: "+94 11 2433333",
        is24Hours: true,
        description: "Main police headquarters for Colombo district",
    },
    {
        name: "Pettah Police Station",
        type: "police",
        lat: 6.9375,
        lng: 79.8525,
        address: "Main Street, Pettah",
        phone: "+94 11 2328222",
        is24Hours: true,
        description: "Police station serving Pettah area",
    },
    {
        name: "Bambalapitiya Police Station",
        type: "police",
        lat: 6.8920,
        lng: 79.8555,
        address: "Galle Road, Bambalapitiya",
        phone: "+94 11 2580222",
        is24Hours: true,
        description: "Police station serving Bambalapitiya",
    },
    {
        name: "National Hospital of Sri Lanka",
        type: "hospital",
        lat: 6.9170,
        lng: 79.8690,
        address: "Regent Street, Colombo 08",
        phone: "+94 11 2691111",
        is24Hours: true,
        description: "Main public hospital with 24hr emergency",
    },
    {
        name: "Lanka Hospitals",
        type: "hospital",
        lat: 6.8830,
        lng: 79.8570,
        address: "578 Elvitigala Mawatha",
        phone: "+94 11 5530000",
        is24Hours: true,
        description: "Private hospital with emergency services",
    },
    {
        name: "Colombo Fire Brigade HQ",
        type: "fire_station",
        lat: 6.9280,
        lng: 79.8555,
        address: "Sir Baron Jayathilaka Mawatha",
        phone: "+94 11 2422222",
        is24Hours: true,
        description: "Central fire station for Colombo",
    },
    {
        name: "Kollupitiya Fire Station",
        type: "fire_station",
        lat: 6.9150,
        lng: 79.8480,
        address: "Galle Road, Kollupitiya",
        phone: "+94 11 2580333",
        is24Hours: true,
        description: "Fire station serving coastal areas",
    },
    {
        name: "City Pharmacy - Fort",
        type: "pharmacy",
        lat: 6.9340,
        lng: 79.8430,
        address: "York Street, Fort",
        phone: "+94 11 2322555",
        is24Hours: false,
        description: "Pharmacy open 8AM-10PM",
    },
    {
        name: "State Pharmaceuticals Corporation",
        type: "pharmacy",
        lat: 6.9200,
        lng: 79.8620,
        address: "Baseline Road",
        phone: "+94 11 2697851",
        is24Hours: false,
        description: "Government pharmacy with subsidized medicines",
    },
    {
        name: "Women's Shelter Colombo",
        type: "shelter",
        lat: 6.9100,
        lng: 79.8700,
        address: "Maradana",
        phone: "+94 11 2695999",
        is24Hours: true,
        description: "Safe shelter for women and children in distress",
    },
];

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function seedSignals() {
    console.log("\n📍 Seeding Signals...");
    const batch = db.batch();
    let count = 0;

    for (const category of CATEGORIES) {
        const templates = SIGNAL_TEMPLATES[category];
        // Create multiple signals per category
        const numSignals = Math.floor(Math.random() * 5) + 6; // 6-10 per category

        for (let i = 0; i < numSignals; i++) {
            const template = randomElement(templates);
            const loc = randomLatLng(COLOMBO_CENTER, 4);
            const daysOld = Math.floor(Math.random() * 30);
            const status = randomElement(STATUSES);

            // Random affected groups (1-3)
            const numGroups = Math.floor(Math.random() * 3) + 1;
            const shuffled = [...AFFECTED_GROUPS].sort(() => 0.5 - Math.random());
            const affectedGroups = shuffled.slice(0, numGroups);

            const confirmationsCount = Math.floor(Math.random() * 15);
            const priorityScore = template.severity * 2 + confirmationsCount * 0.5 + affectedGroups.length * 1.5;

            const ref = db.collection("signals").doc();
            batch.set(ref, {
                category: category,
                description: template.desc,
                severity: template.severity,
                affectedGroups: affectedGroups,
                lat: loc.lat,
                lng: loc.lng,
                status: status,
                hasLocalPhoto: Math.random() > 0.7,
                confirmationsCount: confirmationsCount,
                priorityScore: priorityScore,
                eventTime: daysAgo(daysOld),
                createdAt: daysAgo(daysOld),
                updatedAt: daysAgo(Math.max(0, daysOld - 2)),
                createdBy: "seed-script",
                assignedOrg: status !== "new" ? randomElement(["Municipal Council", "City Services", "Public Works"]) : null,
                statusUpdatedAt: daysAgo(Math.max(0, daysOld - 1)),
            });
            count++;
        }
    }

    await batch.commit();
    console.log(`   ✅ Created ${count} signals`);
}

async function seedAdminRoutes() {
    console.log("\n🛡️ Seeding Admin Routes...");
    const batch = db.batch();

    for (const route of ADMIN_ROUTES) {
        const ref = db.collection("adminRoutes").doc();
        batch.set(ref, {
            ...route,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: "seed-script",
        });
    }

    await batch.commit();
    console.log(`   ✅ Created ${ADMIN_ROUTES.length} routes (${ADMIN_ROUTES.filter(r => r.type === 'safe').length} safe, ${ADMIN_ROUTES.filter(r => r.type === 'unsafe').length} unsafe)`);
}

async function seedHelpRequests() {
    console.log("\n🤝 Seeding Help Requests...");
    const batch = db.batch();

    for (const req of HELP_REQUESTS) {
        const daysOld = Math.floor(Math.random() * 14);
        const ref = db.collection("helpRequests").doc();
        batch.set(ref, {
            ...req,
            createdAt: daysAgo(daysOld),
            pledgeCount: Math.floor(Math.random() * 10),
        });
    }

    await batch.commit();
    console.log(`   ✅ Created ${HELP_REQUESTS.length} help requests`);
}

async function seedWasteZones() {
    console.log("\n🗑️ Seeding Waste Zones...");
    const batch = db.batch();

    for (const zone of WASTE_ZONES) {
        const ref = db.collection("wasteZones").doc();
        batch.set(ref, {
            ...zone,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();
    console.log(`   ✅ Created ${WASTE_ZONES.length} waste zones`);
}

async function seedSafePlaces() {
    console.log("\n🏥 Seeding Safe Places...");
    const batch = db.batch();

    for (const place of SAFE_PLACES) {
        const ref = db.collection("safePlaces").doc();
        batch.set(ref, {
            ...place,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: "seed-script",
        });
    }

    await batch.commit();
    console.log(`   ✅ Created ${SAFE_PLACES.length} safe places`);
}

async function clearCollections() {
    console.log("\n🧹 Clearing existing data...");

    const collections = ["signals", "adminRoutes", "helpRequests", "wasteZones", "safePlaces"];

    for (const collName of collections) {
        const snapshot = await db.collection(collName).get();
        if (snapshot.empty) {
            console.log(`   ${collName}: already empty`);
            continue;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`   ${collName}: deleted ${snapshot.size} documents`);
    }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
    console.log("🏙️ CitySignal Database Seeder");
    console.log("==============================");

    const args = process.argv.slice(2);
    const shouldClear = args.includes("--clear") || args.includes("-c");

    if (shouldClear) {
        await clearCollections();
    }

    await seedSignals();
    await seedAdminRoutes();
    await seedHelpRequests();
    await seedWasteZones();
    await seedSafePlaces();

    console.log("\n==============================");
    console.log("✨ Seeding complete!");
    console.log("\nYour database now contains:");
    console.log("  • 50+ signals across 6 categories");
    console.log("  • 8 admin routes (safe corridors & danger zones)");
    console.log("  • 6 help requests");
    console.log("  • 5 waste collection zones");
    console.log("  • 10 safe places (police, hospitals, etc.)");
    console.log("\nRefresh your app to see the data!");

    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
