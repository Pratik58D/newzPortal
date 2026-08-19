import mongoose from "mongoose";
import dotenv from "dotenv";
import District from "./src/models/district.model.js";
import { generateSlug } from "./src/utilies/generateSlug.js";

dotenv.config();

// [English name, Nepali name, province]
// NOTE: please verify before running, especially the newer/renamed districts
// (Nawalpur, Parasi, Rukum East, Rukum West) - flagged as lower confidence.
const districts = [
  // Koshi
  ["Bhojpur", "भोजपुर", "koshi"], ["Dhankuta", "धनकुटा", "koshi"], ["Ilam", "इलाम", "koshi"],
  ["Jhapa", "झापा", "koshi"], ["Khotang", "खोटाङ", "koshi"], ["Morang", "मोरङ", "koshi"],
  ["Okhaldhunga", "ओखलढुङ्गा", "koshi"], ["Panchthar", "पाँचथर", "koshi"],
  ["Sankhuwasabha", "संखुवासभा", "koshi"], ["Solukhumbu", "सोलुखुम्बु", "koshi"],
  ["Sunsari", "सुनसरी", "koshi"], ["Taplejung", "ताप्लेजुङ", "koshi"],
  ["Terhathum", "तेह्रथुम", "koshi"], ["Udayapur", "उदयपुर", "koshi"],

  // Madhesh
  ["Bara", "बारा", "madesh"], ["Dhanusha", "धनुषा", "madesh"], ["Mahottari", "महोत्तरी", "madesh"],
  ["Parsa", "पर्सा", "madesh"], ["Rautahat", "रौतहट", "madesh"], ["Saptari", "सप्तरी", "madesh"],
  ["Sarlahi", "सर्लाही", "madesh"], ["Siraha", "सिराहा", "madesh"],

  // Bagmati
  ["Bhaktapur", "भक्तपुर", "bagmati"], ["Chitwan", "चितवन", "bagmati"], ["Dhading", "धादिङ", "bagmati"],
  ["Dolakha", "दोलखा", "bagmati"], ["Kathmandu", "काठमाडौं", "bagmati"],
  ["Kavrepalanchok", "काभ्रेपलाञ्चोक", "bagmati"], ["Lalitpur", "ललितपुर", "bagmati"],
  ["Makwanpur", "मकवानपुर", "bagmati"], ["Nuwakot", "नुवाकोट", "bagmati"],
  ["Ramechhap", "रामेछाप", "bagmati"], ["Rasuwa", "रसुवा", "bagmati"], ["Sindhuli", "सिन्धुली", "bagmati"],
  ["Sindhupalchok", "सिन्धुपाल्चोक", "bagmati"],

  // Gandaki
  ["Baglung", "बागलुङ", "gandaki"], ["Gorkha", "गोरखा", "gandaki"], ["Kaski", "कास्की", "gandaki"],
  ["Lamjung", "लमजुङ", "gandaki"], ["Manang", "मनाङ", "gandaki"], ["Mustang", "मुस्ताङ", "gandaki"],
  ["Myagdi", "म्याग्दी", "gandaki"], ["Nawalpur", "नवलपुर", "gandaki"], ["Parbat", "पर्वत", "gandaki"],
  ["Syangja", "स्याङ्जा", "gandaki"], ["Tanahun", "तनहुँ", "gandaki"],

  // Lumbini
  ["Arghakhanchi", "अर्घाखाँची", "lumbini"], ["Banke", "बाँके", "lumbini"], ["Bardiya", "बर्दिया", "lumbini"],
  ["Dang", "दाङ", "lumbini"], ["Rukum East", "रुकुम पूर्व", "lumbini"], ["Gulmi", "गुल्मी", "lumbini"],
  ["Kapilvastu", "कपिलवस्तु", "lumbini"], ["Palpa", "पाल्पा", "lumbini"], ["Parasi", "परासी", "lumbini"],
  ["Pyuthan", "प्युठान", "lumbini"], ["Rolpa", "रोल्पा", "lumbini"], ["Rupandehi", "रुपन्देही", "lumbini"],

  // Karnali
  ["Dailekh", "दैलेख", "karnali"], ["Dolpa", "डोल्पा", "karnali"], ["Humla", "हुम्ला", "karnali"],
  ["Jajarkot", "जाजरकोट", "karnali"], ["Jumla", "जुम्ला", "karnali"], ["Kalikot", "कालिकोट", "karnali"],
  ["Mugu", "मुगु", "karnali"], ["Salyan", "सल्यान", "karnali"], ["Surkhet", "सुर्खेत", "karnali"],
  ["Rukum West", "रुकुम पश्चिम", "karnali"],

  // Sudurpashchim
  ["Achham", "अछाम", "sudurpashchim"], ["Baitadi", "बैतडी", "sudurpashchim"],
  ["Bajhang", "बझाङ", "sudurpashchim"], ["Bajura", "बाजुरा", "sudurpashchim"],
  ["Dadeldhura", "डडेल्धुरा", "sudurpashchim"], ["Darchula", "दार्चुला", "sudurpashchim"],
  ["Kailali", "कैलाली", "sudurpashchim"], ["Kanchanpur", "कञ्चनपुर", "sudurpashchim"],
  ["Doti", "डोटी", "sudurpashchim"],
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI_PROD);

  const existingCount = await District.countDocuments();
  if (existingCount > 0) {
    console.log(`District collection already has ${existingCount} documents - skipping seed.`);
    process.exit();
  }

  const docs = districts.map(([en, np, province]) => ({
    name: { np, en },
    slug: generateSlug(en, np, "district"),
    province,
  }));

  await District.insertMany(docs);
  console.log(`Seeded ${docs.length} districts.`);
  process.exit();
};

run();
