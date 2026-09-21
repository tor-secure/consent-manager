import { languageOf, normalizeLocaleTag } from "./locale-registry";
import { purposeKeyFamily } from "../sdk/purpose-aliases";

const LOCALE_ALIASES: Record<string, string> = { bodo: "brx" };

export type PurposeFamilyCopy = { name: string; description: string };

export type ExtraBannerUiStrings = {
  cookiePreferences: string;
  ageRestricted: string;
  newTag: string;
  status: string;
  consentGiven: string;
  expires: string;
  consentKey: string;
  activeCategories: string;
  downloadReceipt: string;
  revokeConsent: string;
  doNotTrack: string;
  parentalBody2: string;
  essentialOnly: string;
  fullConsent: string;
  customConsent: string;
  required: string;
};

type PurposeFamily = "essential" | "functionality" | "analytics" | "marketing" | "personalization";

function localeKey(locale: string): string {
  const normalized = normalizeLocaleTag(locale) ?? locale;
  const base = languageOf(normalized);
  return LOCALE_ALIASES[base] ?? base;
}

export const DEFAULT_EXTRA_UI: ExtraBannerUiStrings = {
  cookiePreferences: "Cookie Preferences",
  ageRestricted: "Age-restricted",
  newTag: "New",
  status: "Status:",
  consentGiven: "Consent given:",
  expires: "Expires:",
  consentKey: "Key:",
  activeCategories: "Active categories:",
  downloadReceipt: "Download Receipt",
  revokeConsent: "Revoke Consent (DPDP Section 6(4))",
  doNotTrack: "Your browser sent a Do Not Track request. Optional cookies stay off unless you accept.",
  parentalBody2:
    "No analytics, marketing, or behavioral tracking data will be collected. If your parent or guardian wishes to provide consent on your behalf, please contact our Data Protection Officer.",
  essentialOnly: "Essential only",
  fullConsent: "Full consent",
  customConsent: "Custom",
  required: "Required",
};

export const ENGLISH_PURPOSE_PACKS: Record<PurposeFamily, PurposeFamilyCopy> = {
  essential: {
    name: "Necessary",
    description:
      "These cookies are required for the website to work. They keep the site secure, remember your consent choice, and support essential features such as login.",
  },
  functionality: {
    name: "Functional",
    description:
      "These cookies remember choices you make, such as language, region, or display settings, so the site works the way you prefer.",
  },
  analytics: {
    name: "Analytics",
    description:
      "These cookies help us understand how visitors use the website, which pages are popular, and where people drop off, so we can improve the experience.",
  },
  marketing: {
    name: "Advertising",
    description:
      "These cookies are used to show relevant ads, measure campaigns, and build audiences. They may be set by us or by advertising partners.",
  },
  personalization: {
    name: "Personalization",
    description:
      "These cookies remember how you use the site so we can show more relevant content, products, or recommendations.",
  },
};

export const PURPOSE_PACKS: Record<string, Record<PurposeFamily, PurposeFamilyCopy>> = {
  hi: {
    essential: { name: "आवश्यक", description: "ये कुकीज़ वेबसाइट चलाने के लिए आवश्यक हैं। ये साइट को सुरक्षित रखती हैं, आपकी सहमति याद रखती हैं और लॉगिन जैसी आवश्यक सुविधाएँ चलाती हैं।" },
    functionality: { name: "कार्यात्मक", description: "ये कुकीज़ आपकी पसंद याद रखती हैं, जैसे भाषा, क्षेत्र या प्रदर्शन सेटिंग्स, ताकि साइट आपके अनुसार काम करे।" },
    analytics: { name: "विश्लेषण", description: "ये कुकीज़ बताती हैं कि आगंतुक साइट का उपयोग कैसे करते हैं, कौन से पृष्ठ लोकप्रिय हैं और लोग कहाँ छोड़ते हैं, ताकि हम अनुभव सुधार सकें।" },
    marketing: { name: "विज्ञापन", description: "ये कुकीज़ प्रासंगिक विज्ञापन दिखाने, अभियान मापने और दर्शक बनाने के लिए उपयोग होती हैं। इन्हें हम या विज्ञापन साझेदार सेट कर सकते हैं।" },
    personalization: { name: "वैयक्तिकरण", description: "ये कुकीज़ याद रखती हैं कि आप साइट का उपयोग कैसे करते हैं, ताकि हम अधिक प्रासंगिक सामग्री, उत्पाद या सुझाव दिखा सकें।" },
  },
  bn: {
    essential: { name: "প্রয়োজনীয়", description: "এই কুকিগুলো ওয়েবসাইট চালাতে প্রয়োজন। এগুলো সাইট নিরাপদ রাখে, আপনার সম্মতি মনে রাখে এবং লগইনের মতো জরুরি সুবিধা চালায়।" },
    functionality: { name: "কার্যকরী", description: "এই কুকিগুলো আপনার পছন্দ মনে রাখে, যেমন ভাষা, অঞ্চল বা প্রদর্শন সেটিংস, যাতে সাইট আপনার মতো কাজ করে।" },
    analytics: { name: "বিশ্লেষণ", description: "এই কুকিগুলো বোঝায় দর্শকরা সাইট কীভাবে ব্যবহার করেন, কোন পাতা জনপ্রিয় এবং কোথায় ছেড়ে যান, যাতে আমরা অভিজ্ঞতা উন্নত করতে পারি।" },
    marketing: { name: "বিজ্ঞাপন", description: "এই কুকিগুলো প্রাসঙ্গিক বিজ্ঞাপন দেখাতে, প্রচার মাপতে এবং দর্শক তৈরি করতে ব্যবহৃত হয়।" },
    personalization: { name: "ব্যক্তিগতকরণ", description: "এই কুকিগুলো মনে রাখে আপনি সাইট কীভাবে ব্যবহার করেন, যাতে আমরা আরও প্রাসঙ্গিক বিষয়বস্তু বা সুপারিশ দেখাতে পারি।" },
  },
  ta: {
    essential: { name: "அவசியம்", description: "இந்தக் குக்கீகள் இணையதளம் இயங்க அவசியம். அவை தளத்தைப் பாதுகாக்கின்றன, உங்கள் ஒப்புதலை நினைவில் கொள்கின்றன, உள்நுழைவு போன்ற அத்தியாவசிய அம்சங்களை இயக்குகின்றன." },
    functionality: { name: "செயல்பாடு", description: "மொழி, பகுதி அல்லது காட்சி அமைப்புகள் போன்ற உங்கள் தேர்வுகளை இந்தக் குக்கீகள் நினைவில் கொண்டு தளம் உங்களுக்கு ஏற்ப இயங்க உதவுகின்றன." },
    analytics: { name: "பகுப்பாய்வு", description: "பார்வையாளர்கள் தளத்தை எப்படிப் பயன்படுத்துகிறார்கள் என்பதைப் புரிந்து அனுபவத்தை மேம்படுத்த இந்தக் குக்கீகள் உதவுகின்றன." },
    marketing: { name: "விளம்பரம்", description: "தொடர்புடைய விளம்பரங்களைக் காட்டவும், பிரச்சாரங்களை அளக்கவும் இந்தக் குக்கீகள் பயன்படுகின்றன." },
    personalization: { name: "தனிப்பயனாக்கம்", description: "நீங்கள் தளத்தை எப்படிப் பயன்படுத்துகிறீர்கள் என்பதை நினைவில் கொண்டு மேலும் பொருத்தமான உள்ளடக்கத்தைக் காட்ட இந்தக் குக்கீகள் உதவுகின்றன." },
  },
  te: {
    essential: { name: "అవసరం", description: "ఈ కుకీలు వెబ్‌సైట్ పని చేయడానికి అవసరం. అవి సైట్‌ను సురక్షితంగా ఉంచి మీ సమ్మతిని గుర్తుంచుకుంటాయి." },
    functionality: { name: "ఫంక్షనల్", description: "భాష లేదా ప్రాంతం వంటి మీ ఎంపికలను ఈ కుకీలు గుర్తుంచుకుని సైట్ మీకు అనుగుణంగా పని చేస్తుంది." },
    analytics: { name: "విశ్లేషణ", description: "సందర్శకులు సైట్‌ను ఎలా ఉపయోగిస్తారో అర్థం చేసుకుని అనుభవాన్ని మెరుగుపరచడానికి ఈ కుకీలు సహాయపడతాయి." },
    marketing: { name: "ప్రకటనలు", description: "సంబంధిత ప్రకటనలు చూపించడానికి మరియు ప్రచారాలను కొలవడానికి ఈ కుకీలు ఉపయోగపడతాయి." },
    personalization: { name: "వ్యక్తిగతీకరణ", description: "మీరు సైట్‌ను ఎలా ఉపయోగిస్తారో గుర్తుంచుకుని మరింత సంబంధిత కంటెంట్ చూపించడానికి ఈ కుకీలు ఉపయోగపడతాయి." },
  },
  mr: {
    essential: { name: "आवश्यक", description: "ही कुकीज संकेतस्थळ चालवण्यासाठी आवश्यक आहेत. त्या साइट सुरक्षित ठेवतात आणि तुमची संमती आठवतात." },
    functionality: { name: "कार्यात्मक", description: "भाषा किंवा प्रदेश यांसारख्या तुमच्या निवडी या कुकीज आठवतात." },
    analytics: { name: "विश्लेषण", description: "अभ्यागत साइट कशी वापरतात हे समजून अनुभव सुधारण्यासाठी या कुकीज मदत करतात." },
    marketing: { name: "जाहिरात", description: "संबंधित जाहिराती दाखवण्यासाठी आणि मोहिमा मोजण्यासाठी या कुकीज वापरल्या जातात." },
    personalization: { name: "वैयक्तिकरण", description: "तुम्ही साइट कशी वापरता हे आठवून अधिक संबंधित आशय दाखवण्यासाठी या कुकीज मदत करतात." },
  },
  gu: {
    essential: { name: "જરૂરી", description: "આ કુકીઝ વેબસાઇટ ચલાવવા જરૂરી છે. તે સાઇટ સુરક્ષિત રાખે છે અને તમારી સંમતિ યાદ રાખે છે." },
    functionality: { name: "કાર્યાત્મક", description: "ભાષા અથવા પ્રદેશ જેવી તમારી પસંદગીઓ આ કુકીઝ યાદ રાખે છે." },
    analytics: { name: "વિશ્લેષણ", description: "મુલાકાતીઓ સાઇટ કેવી રીતે વાપરે છે તે સમજી અનુભવ સુધારવા આ કુકીઝ મદદ કરે છે." },
    marketing: { name: "જાહેરાત", description: "સંબંધિત જાહેરાતો બતાવવા અને અભિયાન માપવા આ કુકીઝ વપરાય છે." },
    personalization: { name: "વ્યક્તિગતકરણ", description: "તમે સાઇટ કેવી રીતે વાપરો છો તે યાદ રાખી વધુ સંબંધિત સામગ્રી બતાવવા આ કુકીઝ મદદ કરે છે." },
  },
  kn: {
    essential: { name: "ಅಗತ್ಯ", description: "ಈ ಕುಕೀಗಳು ವೆಬ್‌ಸೈಟ್ ಕಾರ್ಯನಿರ್ವಹಿಸಲು ಅಗತ್ಯ. ಅವು ಸೈಟ್ ಸುರಕ್ಷಿತವಾಗಿರಿಸಿ ನಿಮ್ಮ ಸಮ್ಮತಿ ನೆನಪಿಟ್ಟುಕೊಳ್ಳುತ್ತವೆ." },
    functionality: { name: "ಕಾರ್ಯಾತ್ಮಕ", description: "ಭಾಷೆ ಅಥವಾ ಪ್ರದೇಶದಂತಹ ನಿಮ್ಮ ಆಯ್ಕೆಗಳನ್ನು ಈ ಕುಕೀಗಳು ನೆನಪಿಟ್ಟುಕೊಳ್ಳುತ್ತವೆ." },
    analytics: { name: "ವಿಶ್ಲೇಷಣೆ", description: "ಸಂದರ್ಶಕರು ಸೈಟ್ ಅನ್ನು ಹೇಗೆ ಬಳಸುತ್ತಾರೆ ಎಂಬುದನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡು ಅನುಭವ ಸುಧಾರಿಸಲು ಈ ಕುಕೀಗಳು ಸಹಾಯ ಮಾಡುತ್ತವೆ." },
    marketing: { name: "ಜಾಹೀರಾತು", description: "ಸಂಬಂಧಿತ ಜಾಹೀರಾತುಗಳನ್ನು ತೋರಿಸಲು ಮತ್ತು ಅಭಿಯಾನಗಳನ್ನು ಅಳೆಯಲು ಈ ಕುಕೀಗಳು ಬಳಕೆಯಾಗುತ್ತವೆ." },
    personalization: { name: "ವೈಯಕ್ತೀಕರಣ", description: "ನೀವು ಸೈಟ್ ಅನ್ನು ಹೇಗೆ ಬಳಸುತ್ತೀರಿ ಎಂಬುದನ್ನು ನೆನಪಿಟ್ಟುಕೊಂಡು ಹೆಚ್ಚು ಸಂಬಂಧಿತ ವಿಷಯ ತೋರಿಸಲು ಈ ಕುಕೀಗಳು ಸಹಾಯ ಮಾಡುತ್ತವೆ." },
  },
  ml: {
    essential: { name: "ആവശ്യമായവ", description: "വെബ്‌സൈറ്റ് പ്രവർത്തിക്കാൻ ഈ കുക്കികൾ ആവശ്യമാണ്. അവ സൈറ്റ് സുരക്ഷിതമാക്കുകയും നിങ്ങളുടെ സമ്മതം ഓർത്തുവെക്കുകയും ചെയ്യുന്നു." },
    functionality: { name: "ഫംഗ്ഷണൽ", description: "ഭാഷയോ മേഖലയോ പോലുള്ള നിങ്ങളുടെ തിരഞ്ഞെടുപ്പുകൾ ഈ കുക്കികൾ ഓർത്തുവെക്കുന്നു." },
    analytics: { name: "വിശകലനം", description: "സന്ദർശകർ സൈറ്റ് എങ്ങനെ ഉപയോഗിക്കുന്നു എന്ന് മനസ്സിലാക്കി അനുഭവം മെച്ചപ്പെടുത്താൻ ഈ കുക്കികൾ സഹായിക്കുന്നു." },
    marketing: { name: "പരസ്യം", description: "ബന്ധപ്പെട്ട പരസ്യങ്ങൾ കാണിക്കാനും ക്യാമ്പെയ്‌നുകൾ അളക്കാനും ഈ കുക്കികൾ ഉപയോഗിക്കുന്നു." },
    personalization: { name: "വ്യക്തിഗതമാക്കൽ", description: "നിങ്ങൾ സൈറ്റ് എങ്ങനെ ഉപയോഗിക്കുന്നു എന്ന് ഓർത്ത് കൂടുതൽ ബന്ധപ്പെട്ട ഉള്ളടക്കം കാണിക്കാൻ ഈ കുക്കികൾ സഹായിക്കുന്നു." },
  },
  pa: {
    essential: { name: "ਲੋੜੀਂਦੀਆਂ", description: "ਇਹ ਕੂਕੀਜ਼ ਵੈੱਬਸਾਈਟ ਚਲਾਉਣ ਲਈ ਲੋੜੀਂਦੀਆਂ ਹਨ। ਇਹ ਸਾਈਟ ਸੁਰੱਖਿਅਤ ਰੱਖਦੀਆਂ ਹਨ ਅਤੇ ਤੁਹਾਡੀ ਸਹਿਮਤੀ ਯਾਦ ਰੱਖਦੀਆਂ ਹਨ।" },
    functionality: { name: "ਕਾਰਜਸ਼ੀਲ", description: "ਭਾਸ਼ਾ ਜਾਂ ਖੇਤਰ ਵਰਗੀਆਂ ਤੁਹਾਡੀਆਂ ਚੋਣਾਂ ਇਹ ਕੂਕੀਜ਼ ਯਾਦ ਰੱਖਦੀਆਂ ਹਨ।" },
    analytics: { name: "ਵਿਸ਼ਲੇਸ਼ਣ", description: "ਵਿਜ਼ਟਰ ਸਾਈਟ ਨੂੰ ਕਿਵੇਂ ਵਰਤਦੇ ਹਨ ਇਹ ਸਮਝ ਕੇ ਤਜਰਬਾ ਸੁਧਾਰਨ ਲਈ ਇਹ ਕੂਕੀਜ਼ ਮਦਦ ਕਰਦੀਆਂ ਹਨ।" },
    marketing: { name: "ਵਿਗਿਆਪਨ", description: "ਸਬੰਧਤ ਇਸ਼ਤਿਹਾਰ ਦਿਖਾਉਣ ਅਤੇ ਮੁਹਿੰਮਾਂ ਮਾਪਣ ਲਈ ਇਹ ਕੂਕੀਜ਼ ਵਰਤੀਆਂ ਜਾਂਦੀਆਂ ਹਨ।" },
    personalization: { name: "ਨਿੱਜੀਕਰਨ", description: "ਤੁਸੀਂ ਸਾਈਟ ਨੂੰ ਕਿਵੇਂ ਵਰਤਦੇ ਹੋ ਇਹ ਯਾਦ ਰੱਖ ਕੇ ਹੋਰ ਸਬੰਧਤ ਸਮੱਗਰੀ ਦਿਖਾਉਣ ਲਈ ਇਹ ਕੂਕੀਜ਼ ਮਦਦ ਕਰਦੀਆਂ ਹਨ।" },
  },
  or: {
    essential: { name: "ଆବଶ୍ୟକ", description: "ଏହି କୁକିଗୁଡ଼ିକ ୱେବସାଇଟ୍ ଚାଳନା ପାଇଁ ଆବଶ୍ୟକ। ସେମାନେ ସାଇଟ୍ ସୁରକ୍ଷିତ ରଖନ୍ତି ଏବଂ ଆପଣଙ୍କ ସମ୍ମତି ମନେ ରଖନ୍ତି।" },
    functionality: { name: "କାର୍ଯ୍ୟକାରୀ", description: "ଭାଷା କିମ୍ବା ଅଞ୍ଚଳ ଭଳି ଆପଣଙ୍କ ପସନ୍ଦ ଏହି କୁକି ମନେ ରଖେ।" },
    analytics: { name: "ବିଶ୍ଳେଷଣ", description: "ପରିଦର୍ଶକ ସାଇଟ୍ କିପରି ବ୍ୟବହାର କରନ୍ତି ତାହା ବୁଝି ଅଭିଜ୍ଞତା ଉନ୍ନତ କରିବାରେ ଏହି କୁକି ସାହାଯ୍ୟ କରେ।" },
    marketing: { name: "ବିଜ୍ଞାପନ", description: "ପ୍ରାସଙ୍ଗିକ ବିଜ୍ଞାପନ ଦେଖାଇବା ଏବଂ ଅଭିଯାନ ମାପିବା ପାଇଁ ଏହି କୁକି ବ୍ୟବହୃତ ହୁଏ।" },
    personalization: { name: "ବ୍ୟକ୍ତିଗତକରଣ", description: "ଆପଣ ସାଇଟ୍ କିପରି ବ୍ୟବହାର କରନ୍ତି ତାହା ମନେ ରଖି ଅଧିକ ପ୍ରାସଙ୍ଗିକ ବିଷୟବସ୍ତୁ ଦେଖାଇବାରେ ଏହି କୁକି ସାହାଯ୍ୟ କରେ।" },
  },
  as: {
    essential: { name: "প্ৰয়োজনীয়", description: "এই কুকিবোৰ ৱেবছাইট চলাবলৈ প্ৰয়োজনীয়। সেয়ে ছাইট সুৰক্ষিত ৰাখে আৰু আপোনাৰ সন্মতি মনত ৰাখে।" },
    functionality: { name: "কাৰ্যক্ষম", description: "ভাষা বা অঞ্চলৰ দৰে আপোনাৰ পছন্দ এই কুকিবোৰে মনত ৰাখে।" },
    analytics: { name: "বিশ্লেষণ", description: "দৰ্শকে ছাইট কেনেকৈ ব্যৱহাৰ কৰে সেয়া বুজি অভিজ্ঞতা উন্নত কৰাত এই কুকিবোৰে সহায় কৰে।" },
    marketing: { name: "বিজ্ঞাপন", description: "প্ৰাসংগিক বিজ্ঞাপন দেখুৱাবলৈ আৰু অভিযান জুখিবলৈ এই কুকিবোৰ ব্যৱহাৰ হয়।" },
    personalization: { name: "ব্যক্তিগতকৰণ", description: "আপুনি ছাইট কেনেকৈ ব্যৱহাৰ কৰে সেয়া মনত ৰাখি অধিক প্ৰাসংগিক বিষয়বস্তু দেখুৱাবলৈ এই কুকিবোৰে সহায় কৰে।" },
  },
  ur: {
    essential: { name: "ضروری", description: "یہ کوکیز ویب سائٹ چلانے کے لیے ضروری ہیں۔ یہ سائٹ محفوظ رکھتی ہیں اور آپ کی رضامندی یاد رکھتی ہیں۔" },
    functionality: { name: "فعال", description: "زبان یا علاقہ جیسی آپ کی پسند یہ کوکیز یاد رکھتی ہیں۔" },
    analytics: { name: "تجزیہ", description: "زائرین سائٹ کیسے استعمال کرتے ہیں یہ سمجھ کر تجربہ بہتر بنانے میں یہ کوکیز مدد کرتی ہیں۔" },
    marketing: { name: "اشتہارات", description: "متعلقہ اشتہارات دکھانے اور مہمات ناپنے کے لیے یہ کوکیز استعمال ہوتی ہیں۔" },
    personalization: { name: "ذاتی نوعیت", description: "آپ سائٹ کیسے استعمال کرتے ہیں یہ یاد رکھ کر زیادہ متعلقہ مواد دکھانے میں یہ کوکیز مدد کرتی ہیں۔" },
  },
  ne: {
    essential: { name: "आवश्यक", description: "यी कुकीहरू वेबसाइट चलाउन आवश्यक छन्। तिनीहरू साइट सुरक्षित राख्छन् र तपाईंको सहमति सम्झन्छन्।" },
    functionality: { name: "कार्यात्मक", description: "भाषा वा क्षेत्रजस्ता तपाईंका छनोटहरू यी कुकीहरूले सम्झन्छन्।" },
    analytics: { name: "विश्लेषण", description: "आगन्तुकले साइट कसरी प्रयोग गर्छन् भन्ने बुझेर अनुभव सुधार्न यी कुकीहरूले मद्दत गर्छन्।" },
    marketing: { name: "विज्ञापन", description: "सम्बन्धित विज्ञापन देखाउन र अभियान नाप्न यी कुकीहरू प्रयोग गरिन्छ।" },
    personalization: { name: "व्यक्तिगतकरण", description: "तपाईं साइट कसरी प्रयोग गर्नुहुन्छ सम्झेर थप सम्बन्धित सामग्री देखाउन यी कुकीहरूले मद्दत गर्छन्।" },
  },
  sa: {
    essential: { name: "आवश्यकम्", description: "जालस्थलं चालयितुं एताः कुकी-आवश्यकाः। ताः स्थलं सुरक्षितं कुर्वन्ति, भवतः सम्मतिं स्मरन्ति च।" },
    functionality: { name: "कार्यात्मकम्", description: "भाषा-प्रदेशचयनानि एताः स्मरन्ति।" },
    analytics: { name: "विश्लेषणम्", description: "आगन्तुकाः स्थलं कथं प्रयुञ्जते इति ज्ञात्वा अनुभवम् उद्यन्तुं एताः सहायक्यः।" },
    marketing: { name: "विज्ञापनम्", description: "संगतानि विज्ञापनानि दर्शयितुं अभियानानि मापयितुं च एताः प्रयुज्यन्ते।" },
    personalization: { name: "वैयक्तिकरणम्", description: "भवान् स्थलं कथं प्रयुङ्क्ते इति स्मृत्वा अधिकसंगतं विषयं दर्शयितुं एताः सहायक्यः।" },
  },
  kok: {
    essential: { name: "गरजेच्यो", description: "ह्यो कुकीज साइट चालू दवरपाक गरजेच्यो. त्यो साइट सुरक्षित दवरतात आनी तुमची संमती याद दवरतात." },
    functionality: { name: "कार्यात्मक", description: "भास वा प्रदेश सारक्यो तुमच्यो निवडी ह्यो कुकीज याद दवरतात." },
    analytics: { name: "विश्लेषण", description: "भेटपी साइट कशी वापरतात हाचें समजून अनुभव सुदारपाक ह्यो कुकीज मदत करतात." },
    marketing: { name: "जाहिरात", description: "संबंधित जाहिराती दाखोवपाक आनी मोहिमा मापपाक ह्यो कुकीज वापरतात." },
    personalization: { name: "वैयक्तिकरण", description: "तुमी साइट कशी वापरतात हाची याद दवरून चड संबंधित आशय दाखोवपाक ह्यो कुकीज मदत करतात." },
  },
  mai: {
    essential: { name: "आवश्यक", description: "ई कुकी वेबसाइट चलाबय लेल आवश्यक अछि। ई साइट सुरक्षित राखैत अछि आ अहाँक सहमति याद राखैत अछि।" },
    functionality: { name: "कार्यात्मक", description: "भाषा वा क्षेत्र जेकाँ अहाँक पसंद ई कुकी याद राखैत अछि।" },
    analytics: { name: "विश्लेषण", description: "आगंतुक साइट केँ कोना प्रयोग करैत छथि से बुझि अनुभव सुधारबाक लेल ई कुकी मदति करैत अछि।" },
    marketing: { name: "विज्ञापन", description: "संबंधित विज्ञापन देखाबय आ अभियान मापब लेल ई कुकी प्रयोग होइत अछि।" },
    personalization: { name: "वैयक्तिकरण", description: "अहाँ साइट केँ कोना प्रयोग करैत छी से याद राखि बेसी संबंधित सामग्री देखाबय लेल ई कुकी मदति करैत अछि।" },
  },
  doi: {
    essential: { name: "जरूरी", description: "एह् कुकीज वेबसाइट चलाने लेई जरूरी न। एह् साइट सुरक्षित रखदियां न ते तुंदी सहमती याद रखदियां न।" },
    functionality: { name: "कारजी", description: "भाशा जां इलाका बर्गियां तुंदियां पसंदां एह् कुकीज याद रखदियां न।" },
    analytics: { name: "विश्लेषण", description: "आने आले साइट किंयां बरतदे न एह् समझियै तजुर्बा सुधारने लेई एह् कुकीज मदद करदियां न।" },
    marketing: { name: "इश्तिहार", description: "संबंधत इश्तिहार दखाने ते मुहिम नापने लेई एह् कुकीज बरतदियां न।" },
    personalization: { name: "निजीकरण", description: "तुस साइट किंयां बरतदे ओ एह् याद रखियै होर संबंधत सामग्री दखाने लेई एह् कुकीज मदद करदियां न।" },
  },
  ks: {
    essential: { name: "ضروری", description: "یِم کوکیز چھِ ویب سائٹ چلاونہٕ باپتھ ضروٗری۔ یِم چھِ سائٹ محفوٗظ تھاوان تہٕ تُہنٛز رضامندی یاد تھاوان." },
    functionality: { name: "فعال", description: "زبان یا علاقہٕ پٲٹھؠ تُہنٛزۍ پسند یِم یاد تھاوان." },
    analytics: { name: "تجزیہ", description: "برآمدگار سائٹ کِتھ پٲٹھۍ اِستعمال کران یٕہ سمجھتھ تجربہ بہتر بناونہٕ باپتھ یِم مدد کران." },
    marketing: { name: "اشتہار", description: "مُتعلق اشتہار ہاونہٕ تہٕ مُہِم ناپُن باپتھ چھِ یِم اِستعمال گژھان." },
    personalization: { name: "ذٲتی بناوُن", description: "تُہۍ سائٹ کِتھ پٲٹھۍ اِستعمال کٔرِو یٕہ یاد تھاوتھ زیادٕ مُتعلق مواد ہاونہٕ باپتھ یِم مدد کران." },
  },
  sd: {
    essential: { name: "ضروري", description: "هي ڪوڪيز ويب سائيٽ هلائڻ لاءِ ضروري آهن. اهي سائيٽ محفوظ رکن ٿيون ۽ توهان جي رضامندي ياد رکن ٿيون." },
    functionality: { name: "ڪارائتي", description: "ٻولي يا علائقو جهڙيون توهان جون پسنديون هي ڪوڪيز ياد رکن ٿيون." },
    analytics: { name: "تجزيو", description: "زائرين سائيٽ ڪيئن استعمال ڪن ٿا اهو سمجهي تجربو بهتر ڪرڻ ۾ هي ڪوڪيز مدد ڪن ٿيون." },
    marketing: { name: "اشتهار", description: "لاڳاپيل اشتهار ڏيکارڻ ۽ مهمون ماپڻ لاءِ هي ڪوڪيز استعمال ٿين ٿيون." },
    personalization: { name: "ذاتي ڪرڻ", description: "توهان سائيٽ ڪيئن استعمال ڪريو ٿا اهو ياد رکي وڌيڪ لاڳاپيل مواد ڏيکارڻ ۾ هي ڪوڪيز مدد ڪن ٿيون." },
  },
  sat: {
    essential: { name: "ᱞᱟᱹᱠᱛᱤ", description: "ᱱᱚᱶᱟ ᱠᱩᱠᱤ ᱠᱚ ᱣᱮᱵᱽᱥᱟᱭᱤᱴ ᱪᱟᱞᱟᱣ ᱞᱟᱹᱜᱤᱫ ᱞᱟᱹᱠᱛᱤ᱾ ᱩᱱᱠᱩ ᱥᱟᱭᱤᱴ ᱨᱩᱠᱷᱤᱭᱟᱹ ᱫᱚᱦᱚᱭᱟ ᱟᱨ ᱟᱢᱟᱜ ᱥᱤᱠᱟᱹᱨ ᱩᱭᱦᱟᱹᱨ ᱫᱚᱦᱚᱭᱟ᱾" },
    functionality: { name: "ᱠᱟᱹᱢᱤᱦᱚᱨᱟ", description: "ᱯᱟᱹᱨᱥᱤ ᱟᱨᱵᱟᱝ ᱡᱟᱭᱜᱟ ᱞᱮᱠᱟᱱ ᱟᱢᱟᱜ ᱵᱟᱪᱷᱟᱣ ᱱᱚᱶᱟ ᱠᱩᱠᱤ ᱠᱚ ᱩᱭᱦᱟᱹᱨ ᱫᱚᱦᱚᱭᱟ᱾" },
    analytics: { name: "ᱵᱤᱥᱞᱮᱥᱚᱱ", description: "ᱧᱮᱞᱤᱭᱟᱹ ᱥᱟᱭᱤᱴ ᱪᱮᱫ ᱞᱮᱠᱟ ᱵᱮᱵᱷᱟᱨᱟ ᱚᱱᱟ ᱵᱩᱡᱷᱟᱹᱣ ᱠᱟᱛᱮ ᱵᱟᱛᱟᱣ ᱵᱮᱥ ᱞᱟᱹᱜᱤᱫ ᱱᱚᱶᱟ ᱜᱚᱲᱚᱭᱟ᱾" },
    marketing: { name: "ᱵᱤᱜᱽᱭᱟᱯᱚᱱ", description: "ᱡᱚᱲᱟᱣ ᱵᱤᱜᱽᱭᱟᱯᱚᱱ ᱫᱮᱠᱷᱟᱣ ᱟᱨ ᱠᱟᱹᱢᱤ ᱟᱡᱟᱨ ᱞᱟᱹᱜᱤᱫ ᱱᱚᱶᱟ ᱠᱩᱠᱤ ᱵᱮᱵᱷᱟᱨᱚᱜ-ᱟ᱾" },
    personalization: { name: "ᱱᱤᱡᱮᱨᱟᱜ", description: "ᱟᱢ ᱥᱟᱭᱤᱴ ᱪᱮᱫ ᱞᱮᱠᱟ ᱵᱮᱵᱷᱟᱨ ᱮᱫ-ᱟ ᱚᱱᱟ ᱩᱭᱦᱟᱹᱨ ᱫᱚᱦᱚ ᱠᱟᱛᱮ ᱰᱷᱮᱨ ᱡᱚᱲᱟᱣ ᱡᱤᱱᱤᱥ ᱫᱮᱠᱷᱟᱣ ᱞᱟᱹᱜᱤᱫ ᱱᱚᱶᱟ ᱜᱚᱲᱚᱭᱟ᱾" },
  },
  mni: {
    essential: { name: "মথৌ তাইবা", description: "ৱেবসাইট পাইবা নগদবনি কুকি অসি। মসি না সায়িট ঙাকথোকই অমসুং নহাক্কী অয়াবা নিংসিংই।" },
    functionality: { name: "ফংবা", description: "লোল নত্ত্রগা লমদম গুম্বা নহাক্কী খনবদু কুকি অসিনা নিংসিংই।" },
    analytics: { name: "শিল্লিবা", description: "য়েংবিবা সায়িট করম্ননা শিজিন্নৈ হায়বদু খঙদুনা খুদোংচাবা ফগনবা কুকি অসি মতেং পাংই।" },
    marketing: { name: "বিজ্ঞাপন", description: "মরি লৈনবা বিজ্ঞাপন উৎনবা অমসুং কেমপেন শিল্লিবদা কুকি অসি শিজিন্নৈ।" },
    personalization: { name: "মরু ওইহনবা", description: "নহাক্না সায়িট করম্ননা শিজিন্নৈ হায়বদু নিংসিংদুনা হেন্না মরি লৈনবা কনটেন্ট উৎনবা কুকি অসি মতেং পাংই।" },
  },
  brx: {
    essential: { name: "गोनां", description: "बे कुकीफोर वेबसाइट सालायनो गोनां। बिसोर साइट रैखाथि दानो आरो नोंथांनि सहमति गोसोआव लाखो।" },
    functionality: { name: "खामानियाव", description: "राव एबा ओनसोल बायदिरि नोंथांनि सायखनायखौ बे कुकीफोरा गोसोआव लाखो।" },
    analytics: { name: "बिजिरनाय", description: "नायबायदोंफोरा साइट माबोरै बाहायो बेखौ बुझानानै अनुभव मोजां खालामनो बे कुकीफोरा मदद खालामो।" },
    marketing: { name: "बिबान", description: "जोड़ायनाय बिबान दिहुननो आरो हान्जा सुनाय मापनो बे कुकीफोर बाहायजायो।" },
    personalization: { name: "गावनि बादि", description: "नोंथाङा साइट माबोरै बाहायो बेखौ गोसोआव लाखानानै बांसिन जोड़ायनाय आयदा दिहुननो बे कुकीफोरा मदद खालामो।" },
  },
};

const POLICY_TITLES: Record<string, Record<string, string>> = {};
const POLICY_BODIES: Record<string, Record<string, string>> = {};

const TITLE_I18N: Record<string, [string, string][]> = {
  hi: [
    ["We use cookies", "हम कुकीज़ का उपयोग करते हैं"],
    ["Your privacy choices", "आपकी गोपनीयता संबंधी पसंद"],
    ["Cookie notice", "कुकी सूचना"],
    ["Cookies on this site", "इस साइट पर कुकीज़"],
    ["Privacy notice", "गोपनीयता सूचना"],
    ["How we use cookies", "हम कुकीज़ का उपयोग कैसे करते हैं"],
    ["We use cookies to improve your shop", "आपकी खरीदारी बेहतर बनाने के लिए हम कुकीज़ का उपयोग करते हैं"],
  ],
  bn: [
    ["We use cookies", "আমরা কুকি ব্যবহার করি"],
    ["Your privacy choices", "আপনার গোপনীয়তার পছন্দ"],
    ["Cookie notice", "কুকি বিজ্ঞপ্তি"],
    ["Cookies on this site", "এই সাইটে কুকি"],
    ["Privacy notice", "গোপনীয়তা বিজ্ঞপ্তি"],
    ["How we use cookies", "আমরা কুকি কীভাবে ব্যবহার করি"],
    ["We use cookies to improve your shop", "আপনার কেনাকাটা উন্নত করতে আমরা কুকি ব্যবহার করি"],
  ],
  ta: [
    ["We use cookies", "நாங்கள் குக்கீகளைப் பயன்படுத்துகிறோம்"],
    ["Your privacy choices", "உங்கள் தனியுரிமைத் தேர்வுகள்"],
    ["Cookie notice", "குக்கீ அறிவிப்பு"],
    ["Cookies on this site", "இந்தத் தளத்தில் குக்கீகள்"],
    ["Privacy notice", "தனியுரிமை அறிவிப்பு"],
    ["How we use cookies", "நாங்கள் குக்கீகளை எப்படிப் பயன்படுத்துகிறோம்"],
    ["We use cookies to improve your shop", "உங்கள் வாங்குதலை மேம்படுத்த குக்கீகளைப் பயன்படுத்துகிறோம்"],
  ],
  te: [
    ["We use cookies", "మేము కుకీలను ఉపయోగిస్తాము"],
    ["Your privacy choices", "మీ గోప్యతా ఎంపికలు"],
    ["Cookie notice", "కుకీ నోటీసు"],
    ["Cookies on this site", "ఈ సైట్‌లో కుకీలు"],
    ["Privacy notice", "గోప్యతా నోటీసు"],
    ["How we use cookies", "మేము కుకీలను ఎలా ఉపయోగిస్తాము"],
    ["We use cookies to improve your shop", "మీ షాపింగ్‌ను మెరుగుపరచడానికి కుకీలు ఉపయోగిస్తాము"],
  ],
  mr: [
    ["We use cookies", "आम्ही कुकीज वापरतो"],
    ["Your privacy choices", "तुमच्या गोपनीयतेच्या निवडी"],
    ["Cookie notice", "कुकी सूचना"],
    ["Cookies on this site", "या साइटवरील कुकीज"],
    ["Privacy notice", "गोपनीयता सूचना"],
    ["How we use cookies", "आम्ही कुकीज कशा वापरतो"],
    ["We use cookies to improve your shop", "तुमची खरेदी सुधारण्यासाठी आम्ही कुकीज वापरतो"],
  ],
  gu: [
    ["We use cookies", "અમે કુકીઝનો ઉપયોગ કરીએ છીએ"],
    ["Your privacy choices", "તમારી ગોપનીયતા પસંદગીઓ"],
    ["Cookie notice", "કુકી સૂચના"],
    ["Cookies on this site", "આ સાઇટ પર કુકીઝ"],
    ["Privacy notice", "ગોપનીયતા સૂચના"],
    ["How we use cookies", "અમે કુકીઝ કેવી રીતે વાપરીએ છીએ"],
    ["We use cookies to improve your shop", "તમારી ખરીદી સુધારવા અમે કુકીઝ વાપરીએ છીએ"],
  ],
  kn: [
    ["We use cookies", "ನಾವು ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ"],
    ["Your privacy choices", "ನಿಮ್ಮ ಗೌಪ್ಯತೆ ಆಯ್ಕೆಗಳು"],
    ["Cookie notice", "ಕುಕೀ ಸೂಚನೆ"],
    ["Cookies on this site", "ಈ ಸೈಟ್‌ನಲ್ಲಿ ಕುಕೀಗಳು"],
    ["Privacy notice", "ಗೌಪ್ಯತಾ ಸೂಚನೆ"],
    ["How we use cookies", "ನಾವು ಕುಕೀಗಳನ್ನು ಹೇಗೆ ಬಳಸುತ್ತೇವೆ"],
    ["We use cookies to improve your shop", "ನಿಮ್ಮ ಶಾಪಿಂಗ್ ಸುಧಾರಿಸಲು ನಾವು ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ"],
  ],
  ml: [
    ["We use cookies", "ഞങ്ങൾ കുക്കികൾ ഉപയോഗിക്കുന്നു"],
    ["Your privacy choices", "നിങ്ങളുടെ സ്വകാര്യതാ തിരഞ്ഞെടുപ്പുകൾ"],
    ["Cookie notice", "കുക്കി അറിയിപ്പ്"],
    ["Cookies on this site", "ഈ സൈറ്റിലെ കുക്കികൾ"],
    ["Privacy notice", "സ്വകാര്യതാ അറിയിപ്പ്"],
    ["How we use cookies", "ഞങ്ങൾ കുക്കികൾ എങ്ങനെ ഉപയോഗിക്കുന്നു"],
    ["We use cookies to improve your shop", "നിങ്ങളുടെ ഷോപ്പിംഗ് മെച്ചപ്പെടുത്താൻ കുക്കികൾ ഉപയോഗിക്കുന്നു"],
  ],
  pa: [
    ["We use cookies", "ਅਸੀਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ"],
    ["Your privacy choices", "ਤੁਹਾਡੀਆਂ ਪਰਦੇਦਾਰੀ ਚੋਣਾਂ"],
    ["Cookie notice", "ਕੂਕੀ ਸੂਚਨਾ"],
    ["Cookies on this site", "ਇਸ ਸਾਈਟ ਉੱਤੇ ਕੂਕੀਜ਼"],
    ["Privacy notice", "ਪਰਦੇਦਾਰੀ ਸੂਚਨਾ"],
    ["How we use cookies", "ਅਸੀਂ ਕੂਕੀਜ਼ ਕਿਵੇਂ ਵਰਤਦੇ ਹਾਂ"],
    ["We use cookies to improve your shop", "ਤੁਹਾਡੀ ਖਰੀਦਦਾਰੀ ਬਿਹਤਰ ਬਣਾਉਣ ਲਈ ਅਸੀਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ"],
  ],
  ur: [
    ["We use cookies", "ہم کوکیز استعمال کرتے ہیں"],
    ["Your privacy choices", "آپ کی رازداری کی پسند"],
    ["Cookie notice", "کوکی اطلاع"],
    ["Cookies on this site", "اس سائٹ پر کوکیز"],
    ["Privacy notice", "رازداری کی اطلاع"],
    ["How we use cookies", "ہم کوکیز کیسے استعمال کرتے ہیں"],
    ["We use cookies to improve your shop", "آپ کی خریداری بہتر بنانے کے لیے ہم کوکیز استعمال کرتے ہیں"],
  ],
  as: [
    ["We use cookies", "আমি কুকি ব্যৱহাৰ কৰোঁ"],
    ["Your privacy choices", "আপোনাৰ গোপনীয়তাৰ পছন্দ"],
    ["Cookie notice", "কুকি জাননী"],
    ["Cookies on this site", "এই ছাইটত কুকি"],
    ["Privacy notice", "গোপনীয়তা জাননী"],
    ["How we use cookies", "আমি কুকি কেনেকৈ ব্যৱহাৰ কৰোঁ"],
    ["We use cookies to improve your shop", "আপোনাৰ কিনা-কটা উন্নত কৰিবলৈ আমি কুকি ব্যৱহাৰ কৰোঁ"],
  ],
  or: [
    ["We use cookies", "ଆମେ କୁକି ବ୍ୟବହାର କରୁ"],
    ["Your privacy choices", "ଆପଣଙ୍କ ଗୋପନୀୟତା ପସନ୍ଦ"],
    ["Cookie notice", "କୁକି ସୂଚନା"],
    ["Cookies on this site", "ଏହି ସାଇଟରେ କୁକି"],
    ["Privacy notice", "ଗୋପନୀୟତା ସୂଚନା"],
    ["How we use cookies", "ଆମେ କୁକି କିପରି ବ୍ୟବହାର କରୁ"],
    ["We use cookies to improve your shop", "ଆପଣଙ୍କ କିଣାକାଟା ଉନ୍ନତ କରିବାକୁ ଆମେ କୁକି ବ୍ୟବହାର କରୁ"],
  ],
  ne: [
    ["We use cookies", "हामी कुकीहरू प्रयोग गर्छौं"],
    ["Your privacy choices", "तपाईंका गोपनीयता छनोटहरू"],
    ["Cookie notice", "कुकी सूचना"],
    ["Cookies on this site", "यो साइटमा कुकीहरू"],
    ["Privacy notice", "गोपनीयता सूचना"],
    ["How we use cookies", "हामी कुकीहरू कसरी प्रयोग गर्छौं"],
    ["We use cookies to improve your shop", "तपाईंको किनमेल सुधार्न हामी कुकीहरू प्रयोग गर्छौं"],
  ],
  sa: [
    ["We use cookies", "वयं कुकी-उपयोगं कुर्मः"],
    ["Your privacy choices", "भवतः गोपनीयता-विकल्पाः"],
    ["Cookie notice", "कुकी-सूचना"],
    ["Cookies on this site", "अस्मिन् स्थले कुकीः"],
    ["Privacy notice", "गोपनीयता-सूचना"],
    ["How we use cookies", "वयं कुकीः कथं प्रयुञ्ज्महे"],
    ["We use cookies to improve your shop", "भवतः क्रयणम् उद्यन्तुं वयं कुकीः प्रयुञ्ज्महे"],
  ],
  kok: [
    ["We use cookies", "आमी कुकीज वापरतात"],
    ["Your privacy choices", "तुमच्या गोपनीयतेच्यो निवडी"],
    ["Cookie notice", "कुकी सूचना"],
    ["Cookies on this site", "ह्या सायटीर कुकीज"],
    ["Privacy notice", "गोपनीयता सूचना"],
    ["How we use cookies", "आमी कुकीज कशे वापरतात"],
    ["We use cookies to improve your shop", "तुमची खरेदी सुदारपाक आमी कुकीज वापरतात"],
  ],
  mai: [
    ["We use cookies", "हम कुकीक प्रयोग करैत छी"],
    ["Your privacy choices", "अहाँक गोपनीयताक पसंद"],
    ["Cookie notice", "कुकी सूचना"],
    ["Cookies on this site", "एहि साइट पर कुकी"],
    ["Privacy notice", "गोपनीयता सूचना"],
    ["How we use cookies", "हम कुकीक प्रयोग कोना करैत छी"],
    ["We use cookies to improve your shop", "अहाँक खरीद सुधारबाक लेल हम कुकी प्रयोग करैत छी"],
  ],
  doi: [
    ["We use cookies", "अस कुकीज बरतदे हां"],
    ["Your privacy choices", "तुंदियां परदेदारी पसंदां"],
    ["Cookie notice", "कुकी सूचना"],
    ["Cookies on this site", "इस साइट पर कुकीज"],
    ["Privacy notice", "परदेदारी सूचना"],
    ["How we use cookies", "अस कुकीज किंयां बरतदे हां"],
    ["We use cookies to improve your shop", "तुंदी खरीद सुधारने लेई अस कुकीज बरतदे हां"],
  ],
  ks: [
    ["We use cookies", "أسۍ چھِ کوکیز اِستعمال کران"],
    ["Your privacy choices", "تُہنٛزۍ رازدٲری پسند"],
    ["Cookie notice", "کوکی اطلاع"],
    ["Cookies on this site", "یتھ سائٹس پٮ۪ٹھ کوکیز"],
    ["Privacy notice", "رازدٲری اطلاع"],
    ["How we use cookies", "أسۍ چھِ کوکیز کِتھ پٲٹھۍ اِستعمال کران"],
    ["We use cookies to improve your shop", "تُہنٛز خریدٲری بہتر بناونہٕ باپتھ أسۍ کوکیز اِستعمال کران"],
  ],
  sd: [
    ["We use cookies", "اسان ڪوڪيز استعمال ڪريون ٿا"],
    ["Your privacy choices", "توهان جون رازداري پسنديون"],
    ["Cookie notice", "ڪوڪي اطلاع"],
    ["Cookies on this site", "هن سائيٽ تي ڪوڪيز"],
    ["Privacy notice", "رازداري اطلاع"],
    ["How we use cookies", "اسان ڪوڪيز ڪيئن استعمال ڪريون ٿا"],
    ["We use cookies to improve your shop", "توهان جي خريداري بهتر ڪرڻ لاءِ اسان ڪوڪيز استعمال ڪريون ٿا"],
  ],
  sat: [
    ["We use cookies", "ᱟᱞᱮ ᱠᱩᱠᱤ ᱵᱮᱵᱷᱟᱨ ᱫᱟᱲᱮᱭᱟ"],
    ["Your privacy choices", "ᱟᱢᱟᱜ ᱜᱚᱯᱚᱱᱤᱭᱚᱛᱟ ᱵᱟᱪᱷᱟᱣ"],
    ["Cookie notice", "ᱠᱩᱠᱤ ᱠᱷᱚᱵᱚᱨ"],
    ["Cookies on this site", "ᱱᱚᱶᱟ ᱥᱟᱭᱤᱴ ᱨᱮ ᱠᱩᱠᱤ"],
    ["Privacy notice", "ᱜᱚᱯᱚᱱᱤᱭᱚᱛᱟ ᱠᱷᱚᱵᱚᱨ"],
    ["How we use cookies", "ᱟᱞᱮ ᱠᱩᱠᱤ ᱪᱮᱫ ᱞᱮᱠᱟ ᱵᱮᱵᱷᱟᱨ ᱫᱟᱲᱮᱭᱟ"],
    ["We use cookies to improve your shop", "ᱟᱢᱟᱜ ᱠᱤᱨᱤᱧ ᱵᱮᱥ ᱞᱟᱹᱜᱤᱫ ᱟᱞᱮ ᱠᱩᱠᱤ ᱵᱮᱵᱷᱟᱨ ᱫᱟᱲᱮᱭᱟ"],
  ],
  mni: [
    ["We use cookies", "ঐখোয়না কুকি শিজিন্নৈ"],
    ["Your privacy choices", "নহাক্কী প্রাইভেসি খনবশিং"],
    ["Cookie notice", "কুকি পাউ"],
    ["Cookies on this site", "সায়িট অসিদা কুকি"],
    ["Privacy notice", "প্রাইভেসি পাউ"],
    ["How we use cookies", "ঐখোয়না কুকি করম্ননা শিজিন্নৈ"],
    ["We use cookies to improve your shop", "নহাক্কী শোপ ফগনবা ঐখোয়না কুকি শিজিন্নৈ"],
  ],
  brx: [
    ["We use cookies", "जों कुकीफोर बाहायो"],
    ["Your privacy choices", "नोंथांनि गुमुरनाय सायखनायफोर"],
    ["Cookie notice", "कुकी खौरां"],
    ["Cookies on this site", "बे साइटआव कुकीफोर"],
    ["Privacy notice", "गुमुरनाय खौरां"],
    ["How we use cookies", "जों कुकीफोर माबोरै बाहायो"],
    ["We use cookies to improve your shop", "नोंथांनि बायनाय मोजां खालामनो जों कुकीफोर बाहायो"],
  ],
};

const BODY_I18N: Record<string, [string, string][]> = {
  hi: [
    [
      "We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.",
      "हम यह साइट चलाने के लिए कुकीज़ और समान तकनीकों का उपयोग करते हैं, और आपकी अनुमति से उपयोग मापते हैं तथा प्रासंगिक सामग्री दिखाते हैं।",
    ],
    [
      "We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.",
      "साइट चलाने के लिए हम आवश्यक कुकीज़ का उपयोग करते हैं। आपकी सहमति से विश्लेषण और विज्ञापन कुकीज़ भी उपयोग होती हैं। आप अपनी पसंद कभी भी बदल सकते हैं।",
    ],
    [
      "We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.",
      "यहाँ बताए गए उद्देश्यों के लिए हम व्यक्तिगत डेटा संसाधित करते हैं। आवश्यक प्रसंस्करण साइट चालू रखता है। अन्य उद्देश्यों के लिए आपकी सहमति चाहिए, जिसे आप बाद में वापस ले सकते हैं।",
    ],
    [
      "We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.",
      "हम साइट चलाने तथा माप और विज्ञापन के लिए कुकीज़ का उपयोग करते हैं। नीचे आप बिक्री/साझा-शैली विज्ञापन और विश्लेषण कुकीज़ से बाहर निकल सकते हैं।",
    ],
    [
      "We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.",
      "साइट चलाने के लिए हम आवश्यक कुकीज़ का उपयोग करते हैं। यदि आप सहमत हैं, तो हम यह समझने के लिए विश्लेषण कुकीज़ भी उपयोग करते हैं कि साइट कैसे उपयोग होती है।",
    ],
    [
      "We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.",
      "साइट चलाने के लिए हम आवश्यक कुकीज़ का उपयोग करते हैं। आपकी सहमति से विश्लेषण और विज्ञापन कुकीज़ भी उपयोग होती हैं। आप गैर-आवश्यक कुकीज़ अस्वीकार कर सकते हैं या पसंद कभी भी बदल सकते हैं।",
    ],
    [
      "We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.",
      "साइट चलाने के लिए जरूरी कुकीज़ हम उपयोग करते हैं। आपकी सहमति से पसंद याद रखने और उपयोग मापने की कुकीज़ भी उपयोग होती हैं।",
    ],
    [
      "We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.",
      "साइट चलाने के लिए आवश्यक कुकीज़ हम उपयोग करते हैं। वैकल्पिक विश्लेषण और विज्ञापन कुकीज़ तभी उपयोग होती हैं जब आप सहमत हों।",
    ],
    [
      "Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.",
      "आवश्यक कुकीज़ चेकआउट और आपकी कार्ट चालू रखती हैं। अन्य कुकीज़ पसंद याद रखने, विज़िट मापने और आपकी सहमति से संबंधित ऑफ़र दिखाने में मदद करती हैं।",
    ],
    [
      "We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.",
      "साइट चलाने के लिए आवश्यक कुकीज़ हम उपयोग करते हैं। आपकी सहमति से हम पाठक संख्या मापते हैं, सामग्री वैयक्तिक करते हैं और विज्ञापन से साइट चलाते हैं।",
    ],
  ],
  bn: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "আমরা এই সাইট চালাতে কুকি ও অনুরূপ প্রযুক্তি ব্যবহার করি, এবং আপনার অনুমতিতে ব্যবহার মাপি ও প্রাসঙ্গিক বিষয়বস্তু দেখাই।"],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "সাইট চালাতে আমরা প্রয়োজনীয় কুকি ব্যবহার করি। আপনার সম্মতিতে বিশ্লেষণ ও বিজ্ঞাপন কুকিও ব্যবহার হয়। আপনি যেকোনো সময় পছন্দ বদলাতে পারেন।"],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "এখানে বর্ণিত উদ্দেশ্যে আমরা ব্যক্তিগত তথ্য প্রক্রিয়া করি। প্রয়োজনীয় প্রক্রিয়াকরণ সাইট চালু রাখে। অন্য উদ্দেশ্যে আপনার সম্মতি লাগে, যা পরে প্রত্যাহার করা যায়।"],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "সাইট চালাতে এবং মাপতে ও বিজ্ঞাপন দিতে আমরা কুকি ব্যবহার করি। নিচে বিক্রি/শেয়ার-ধরনের বিজ্ঞাপন ও বিশ্লেষণ কুকি থেকে আপনি বেরিয়ে আসতে পারেন।"],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "সাইট চালাতে আমরা প্রয়োজনীয় কুকি ব্যবহার করি। আপনি রাজি থাকলে সাইট কীভাবে ব্যবহৃত হয় তা বুঝতে বিশ্লেষণ কুকিও ব্যবহার করি।"],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "সাইট চালাতে আমরা প্রয়োজনীয় কুকি ব্যবহার করি। আপনার সম্মতিতে বিশ্লেষণ ও বিজ্ঞাপন কুকিও ব্যবহার হয়। আপনি অপ্রয়োজনীয় কুকি প্রত্যাখ্যান করতে বা পছন্দ বদলাতে পারেন।"],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "সাইট চালাতে দরকারি কুকি আমরা ব্যবহার করি। আপনার সম্মতিতে পছন্দ মনে রাখতে ও ব্যবহার মাপতেও কুকি ব্যবহার হয়।"],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "সাইট চালাতে প্রয়োজনীয় কুকি আমরা ব্যবহার করি। ঐচ্ছিক বিশ্লেষণ ও বিজ্ঞাপন কুকি কেবল আপনি রাজি থাকলে ব্যবহার হয়।"],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "প্রয়োজনীয় কুকি চেকআউট ও কার্ট চালু রাখে। অন্য কুকি পছন্দ মনে রাখে, ভিজিট মাপে এবং আপনি রাজি থাকলে প্রাসঙ্গিক অফার দেখায়।"],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "সাইট চালাতে প্রয়োজনীয় কুকি আমরা ব্যবহার করি। আপনার সম্মতিতে পাঠকসংখ্যা মাপি, বিষয়বস্তু ব্যক্তিগত করি এবং বিজ্ঞাপনে সাইট চালাই।"],
  ],
  ta: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "இத்தளத்தை இயக்க குக்கீகளையும் ஒத்த தொழில்நுட்பங்களையும் பயன்படுத்துகிறோம். உங்கள் அனுமதியுடன் பயன்பாட்டை அளந்து தொடர்புடைய உள்ளடக்கத்தைக் காட்டுகிறோம்."],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "தளம் இயங்க அவசியக் குக்கீகளைப் பயன்படுத்துகிறோம். உங்கள் ஒப்புதலுடன் பகுப்பாய்வு மற்றும் விளம்பரக் குக்கீகளும் பயன்படுத்தப்படும். நீங்கள் எப்போதும் தேர்வை மாற்றலாம்."],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "இங்கு கூறிய நோக்கங்களுக்காக தனிப்பட்ட தரவைச் செயலாக்குகிறோம். அவசியச் செயலாக்கம் தளத்தை இயங்க வைக்கிறது. பிற நோக்கங்களுக்கு உங்கள் ஒப்புதல் வேண்டும்; பின்னர் திரும்பப் பெறலாம்."],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "தளத்தை இயக்கவும் அளக்கவும் விளம்பரம் செய்யவும் குக்கீகளைப் பயன்படுத்துகிறோம். கீழே விற்பனை/பகிர்வு விளம்பரம் மற்றும் பகுப்பாய்வுக் குக்கீகளில் இருந்து விலகலாம்."],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "தளத்தை இயக்க அவசியக் குக்கீகளைப் பயன்படுத்துகிறோம். நீங்கள் ஒப்புக்கொண்டால் தளம் எப்படிப் பயன்படுத்தப்படுகிறது என்பதைப் புரிய பகுப்பாய்வுக் குக்கீகளும் பயன்படும்."],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "தளம் இயங்க அவசியக் குக்கீகளைப் பயன்படுத்துகிறோம். உங்கள் ஒப்புதலுடன் பகுப்பாய்வு மற்றும் விளம்பரக் குக்கீகளும் பயன்படும். அவசியமற்ற குக்கீகளை நிராகரிக்கலாம் அல்லது தேர்வை மாற்றலாம்."],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "தளம் இயங்க தேவையான குக்கீகளைப் பயன்படுத்துகிறோம். உங்கள் ஒப்புதலுடன் விருப்பங்களை நினைவில் கொள்ளவும் பயன்பாட்டை அளக்கவும் குக்கீகள் பயன்படும்."],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "தளத்தை இயக்க அவசியக் குக்கீகளைப் பயன்படுத்துகிறோம். விருப்ப பகுப்பாய்வு மற்றும் விளம்பரக் குக்கீகள் நீங்கள் ஒப்புக்கொண்டால் மட்டுமே பயன்படுத்தப்படும்."],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "அவசியக் குக்கீகள் செக்அவுட்டையும் கூடையையும் இயங்க வைக்கின்றன. பிற குக்கீகள் விருப்பங்களை நினைவில் கொண்டு, வருகைகளை அளந்து, நீங்கள் ஒப்புக்கொண்டால் தொடர்புடைய சலுகைகளைக் காட்ட உதவுகின்றன."],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "தளத்தை இயக்க அவசியக் குக்கீகளைப் பயன்படுத்துகிறோம். உங்கள் ஒப்புதலுடன் வாசகர் எண்ணிக்கையை அளந்து, உள்ளடக்கத்தைத் தனிப்பயனாக்கி, விளம்பரத்தால் தளத்தை நடத்துகிறோம்."],
  ],
  te: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "ఈ సైట్ నడపడానికి కుకీలు మరియు సమాన సాంకేతికతలను ఉపయోగిస్తాము. మీ అనుమతితో వినియోగం కొలిచి సంబంధిత కంటెంట్ చూపిస్తాము."],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "సైట్ పని చేయడానికి అవసరమైన కుకీలు ఉపయోగిస్తాము. మీ సమ్మతితో విశ్లేషణ మరియు ప్రకటన కుకీలు కూడా ఉపయోగపడతాయి. మీరు ఎప్పుడైనా ఎంపికలు మార్చవచ్చు."],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "ఇక్కడ చెప్పిన ప్రయోజనాల కోసం వ్యక్తిగత డేటాను ప్రాసెస్ చేస్తాము. అవసరమైన ప్రాసెసింగ్ సైట్‌ను నడుపుతుంది. ఇతర ప్రయోజనాలకు మీ సమ్మతి కావాలి; తర్వాత ఉపసంహరించవచ్చు."],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "సైట్ నడపడానికి మరియు కొలవడానికి, ప్రకటనలకు కుకీలు ఉపయోగిస్తాము. కింద అమ్మకం/షేర్-శైలి ప్రకటనలు మరియు విశ్లేషణ కుకీల నుంచి మీరు బయటపడవచ్చు."],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "సైట్ నడపడానికి అవసరమైన కుకీలు ఉపయోగిస్తాము. మీరు అంగీకరిస్తే సైట్ ఎలా ఉపయోగించబడుతుందో అర్థం చేసుకోవడానికి విశ్లేషణ కుకీలు కూడా ఉపయోగిస్తాము."],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "సైట్ పని చేయడానికి అవసరమైన కుకీలు ఉపయోగిస్తాము. మీ సమ్మతితో విశ్లేషణ మరియు ప్రకటన కుకీలు కూడా ఉపయోగపడతాయి. అవసరం కాని కుకీలను తిరస్కరించవచ్చు లేదా ఎంపికలు మార్చవచ్చు."],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "సైట్ నడపడానికి కావాల్సిన కుకీలు ఉపయోగిస్తాము. మీ సమ్మతితో ప్రాధాన్యాలు గుర్తుంచుకోవడానికి మరియు వినియోగం కొలవడానికి కుకీలు కూడా ఉపయోగపడతాయి."],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "సైట్ నడపడానికి అవసరమైన కుకీలు ఉపయోగిస్తాము. ఐచ్ఛిక విశ్లేషణ మరియు ప్రకటన కుకీలు మీరు అంగీకరిస్తే మాత్రమే ఉపయోగపడతాయి."],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "అవసరమైన కుకీలు చెక్అవుట్ మరియు కార్ట్ పని చేయిస్తాయి. ఇతర కుకీలు ప్రాధాన్యాలు గుర్తుంచుకుని, సందర్శనలు కొలిచి, మీరు అంగీకరిస్తే సంబంధిత ఆఫర్‌లు చూపిస్తాయి."],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "సైట్ నడపడానికి అవసరమైన కుకీలు ఉపయోగిస్తాము. మీ సమ్మతితో పాఠకుల సంఖ్య కొలిచి, కంటెంట్ వ్యక్తిగతీకరించి, ప్రకటనలతో సైట్ నడుపుతాము."],
  ],
  mr: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "ही साइट चालवण्यासाठी आम्ही कुकीज आणि तत्सम तंत्रज्ञान वापरतो, आणि तुमच्या परवानगीने वापर मोजतो व संबंधित आशय दाखवतो."],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "साइट चालवण्यासाठी आवश्यक कुकीज वापरतो. तुमच्या संमतीने विश्लेषण आणि जाहिरात कुकीजही वापरल्या जातात. तुम्ही निवड कधीही बदलू शकता."],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "येथे सांगितलेल्या उद्देशांसाठी आम्ही वैयक्तिक डेटा प्रक्रिया करतो. आवश्यक प्रक्रिया साइट चालू ठेवते. इतर उद्देशांसाठी तुमची संमती लागते, जी नंतर मागे घेता येते."],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "साइट चालवण्यासाठी तसेच मोजमाप व जाहिरातीसाठी कुकीज वापरतो. खाली विक्री/शेअर-शैली जाहिरात आणि विश्लेषण कुकीजमधून तुम्ही बाहेर पडू शकता."],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "साइट चालवण्यासाठी आवश्यक कुकीज वापरतो. तुम्ही सहमत असाल तर साइट कशी वापरली जाते हे समजण्यासाठी विश्लेषण कुकीजही वापरतो."],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "साइट चालवण्यासाठी आवश्यक कुकीज वापरतो. तुमच्या संमतीने विश्लेषण आणि जाहिरात कुकीजही वापरल्या जातात. अनावश्यक कुकीज नाकारता येतात किंवा निवड बदलता येते."],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "साइट चालवण्यासाठी लागणाऱ्या कुकीज वापरतो. तुमच्या संमतीने पसंती आठवण्यासाठी आणि वापर मोजण्यासाठीही कुकीज वापरल्या जातात."],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "साइट चालवण्यासाठी आवश्यक कुकीज वापरतो. वैकल्पिक विश्लेषण आणि जाहिरात कुकीज फक्त तुम्ही सहमत असाल तर वापरल्या जातात."],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "आवश्यक कुकीज चेकआउट आणि कार्ट चालू ठेवतात. इतर कुकीज पसंती आठवतात, भेटी मोजतात आणि तुम्ही सहमत असाल तर संबंधित ऑफर दाखवतात."],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "साइट चालवण्यासाठी आवश्यक कुकीज वापरतो. तुमच्या संमतीने वाचकसंख्या मोजतो, आशय वैयक्तिक करतो आणि जाहिरातीने साइट चालवतो."],
  ],
  gu: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "આ સાઇટ ચલાવવા અમે કુકીઝ અને સમાન તકનીકો વાપરીએ છીએ, અને તમારી પરવાનગીથી ઉપયોગ માપીએ અને સંબંધિત સામગ્રી બતાવીએ છીએ."],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "સાઇટ ચલાવવા જરૂરી કુકીઝ વાપરીએ છીએ. તમારી સંમતિથી વિશ્લેષણ અને જાહેરાત કુકીઝ પણ વપરાય છે. તમે પસંદગી ક્યારે પણ બદલી શકો."],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "અહીં કહેલા હેતુઓ માટે અમે વ્યક્તિગત ડેટા પ્રક્રિયા કરીએ છીએ. જરૂરી પ્રક્રિયા સાઇટ ચાલુ રાખે છે. અન્ય હેતુઓ માટે તમારી સંમતિ જોઈએ, જે પછીથી પાછી લઈ શકાય."],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "સાઇટ ચલાવવા તેમજ માપવા અને જાહેરાત માટે કુકીઝ વાપરીએ છીએ. નીચે વેચાણ/શેર-શૈલી જાહેરાત અને વિશ્લેષણ કુકીઝમાંથી તમે બહાર નીકળી શકો."],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "સાઇટ ચલાવવા જરૂરી કુકીઝ વાપરીએ છીએ. તમે સંમત હોવ તો સાઇટ કેવી રીતે વપરાય છે તે સમજવા વિશ્લેષણ કુકીઝ પણ વાપરીએ છીએ."],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "સાઇટ ચલાવવા જરૂરી કુકીઝ વાપરીએ છીએ. તમારી સંમતિથી વિશ્લેષણ અને જાહેરાત કુકીઝ પણ વપરાય છે. બિનજરૂરી કુકીઝ નકારી શકો અથવા પસંદગી બદલી શકો."],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "સાઇટ ચલાવવા જરૂરી કુકીઝ વાપરીએ છીએ. તમારી સંમતિથી પસંદગી યાદ રાખવા અને ઉપયોગ માપવા કુકીઝ પણ વપરાય છે."],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "સાઇટ ચલાવવા જરૂરી કુકીઝ વાપરીએ છીએ. વૈકલ્પિક વિશ્લેષણ અને જાહેરાત કુકીઝ તમે સંમત હોવ ત્યારે જ વપરાય છે."],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "જરૂરી કુકીઝ ચેકઆઉટ અને કાર્ટ ચાલુ રાખે છે. અન્ય કુકીઝ પસંદગી યાદ રાખે, મુલાકાત માપે અને તમે સંમત હોવ તો સંબંધિત ઑફર બતાવે છે."],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "સાઇટ ચલાવવા જરૂરી કુકીઝ વાપરીએ છીએ. તમારી સંમતિથી વાચકસંખ્યા માપીએ, સામગ્રી વ્યક્તિગત કરીએ અને જાહેરાતથી સાઇટ ચલાવીએ છીએ."],
  ],
  kn: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "ಈ ಸೈಟ್ ನಡೆಸಲು ನಾವು ಕುಕೀಗಳು ಮತ್ತು ಸಮಾನ ತಂತ್ರಜ್ಞಾನಗಳನ್ನು ಬಳಸುತ್ತೇವೆ, ಮತ್ತು ನಿಮ್ಮ ಅನುಮತಿಯಿಂದ ಬಳಕೆ ಅಳೆದು ಸಂಬಂಧಿತ ವಿಷಯ ತೋರಿಸುತ್ತೇವೆ."],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "ಸೈಟ್ ಕಾರ್ಯನಿರ್ವಹಿಸಲು ಅಗತ್ಯ ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ನಿಮ್ಮ ಸಮ್ಮತಿಯಿಂದ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಜಾಹೀರಾತು ಕುಕೀಗಳೂ ಬಳಕೆಯಾಗುತ್ತವೆ. ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಆಯ್ಕೆ ಬದಲಾಯಿಸಬಹುದು."],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "ಇಲ್ಲಿ ಹೇಳಿದ ಉದ್ದೇಶಗಳಿಗಾಗಿ ನಾವು ವೈಯಕ್ತಿಕ ಡೇಟಾ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತೇವೆ. ಅಗತ್ಯ ಪ್ರಕ್ರಿಯೆ ಸೈಟ್ ನಡೆಸುತ್ತದೆ. ಇತರ ಉದ್ದೇಶಗಳಿಗೆ ನಿಮ್ಮ ಸಮ್ಮತಿ ಬೇಕು; ನಂತರ ಹಿಂತೆಗೆದುಕೊಳ್ಳಬಹುದು."],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "ಸೈಟ್ ನಡೆಸಲು ಹಾಗೂ ಅಳೆಯಲು ಮತ್ತು ಜಾಹೀರಾತು ಮಾಡಲು ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ಕೆಳಗೆ ಮಾರಾಟ/ಹಂಚಿಕೆ-ಶೈಲಿ ಜಾಹೀರಾತು ಮತ್ತು ವಿಶ್ಲೇಷಣೆ ಕುಕೀಗಳಿಂದ ನೀವು ಹೊರಗುಳಿಯಬಹುದು."],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "ಸೈಟ್ ನಡೆಸಲು ಅಗತ್ಯ ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ನೀವು ಒಪ್ಪಿದರೆ ಸೈಟ್ ಹೇಗೆ ಬಳಕೆಯಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ವಿಶ್ಲೇಷಣೆ ಕುಕೀಗಳನ್ನೂ ಬಳಸುತ್ತೇವೆ."],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "ಸೈಟ್ ಕಾರ್ಯನಿರ್ವಹಿಸಲು ಅಗತ್ಯ ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ನಿಮ್ಮ ಸಮ್ಮತಿಯಿಂದ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಜಾಹೀರಾತು ಕುಕೀಗಳೂ ಬಳಕೆಯಾಗುತ್ತವೆ. ಅನಗತ್ಯ ಕುಕೀಗಳನ್ನು ನಿರಾಕರಿಸಬಹುದು ಅಥವಾ ಆಯ್ಕೆ ಬದಲಾಯಿಸಬಹುದು."],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "ಸೈಟ್ ನಡೆಸಲು ಬೇಕಾದ ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ನಿಮ್ಮ ಸಮ್ಮತಿಯಿಂದ ಆದ್ಯತೆ ನೆನಪಿಡಲು ಮತ್ತು ಬಳಕೆ ಅಳೆಯಲು ಕುಕೀಗಳೂ ಬಳಕೆಯಾಗುತ್ತವೆ."],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "ಸೈಟ್ ನಡೆಸಲು ಅಗತ್ಯ ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ಐಚ್ಛಿಕ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಜಾಹೀರಾತು ಕುಕೀಗಳು ನೀವು ಒಪ್ಪಿದಾಗ ಮಾತ್ರ ಬಳಕೆಯಾಗುತ್ತವೆ."],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "ಅಗತ್ಯ ಕುಕೀಗಳು ಚೆಕ್‌ಔಟ್ ಮತ್ತು ಕಾರ್ಟ್ ಕಾರ್ಯನಿರ್ವಹಿಸುವಂತೆ ಮಾಡುತ್ತವೆ. ಇತರ ಕುಕೀಗಳು ಆದ್ಯತೆ ನೆನಪಿಟ್ಟುಕೊಂಡು, ಭೇಟಿ ಅಳೆದು, ನೀವು ಒಪ್ಪಿದರೆ ಸಂಬಂಧಿತ ಆಫರ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತವೆ."],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "ಸೈಟ್ ನಡೆಸಲು ಅಗತ್ಯ ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. ನಿಮ್ಮ ಸಮ್ಮತಿಯಿಂದ ಓದುಗರ ಸಂಖ್ಯೆ ಅಳೆದು, ವಿಷಯ ವೈಯಕ್ತೀಕರಿಸಿ, ಜಾಹೀರಾತಿನಿಂದ ಸೈಟ್ ನಡೆಸುತ್ತೇವೆ."],
  ],
  ml: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "ഈ സൈറ്റ് പ്രവർത്തിപ്പിക്കാൻ കുക്കികളും സമാന സാങ്കേതികവിദ്യകളും ഉപയോഗിക്കുന്നു. നിങ്ങളുടെ അനുമതിയോടെ ഉപയോഗം അളന്ന് ബന്ധപ്പെട്ട ഉള്ളടക്കം കാണിക്കുന്നു."],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "സൈറ്റ് പ്രവർത്തിക്കാൻ ആവശ്യമായ കുക്കികൾ ഉപയോഗിക്കുന്നു. നിങ്ങളുടെ സമ്മതത്തോടെ വിശകലനവും പരസ്യ കുക്കികളും ഉപയോഗിക്കും. നിങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും തിരഞ്ഞെടുപ്പ് മാറ്റാം."],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "ഇവിടെ പറഞ്ഞ ആവശ്യങ്ങൾക്കായി വ്യക്തിഗത ഡാറ്റ പ്രോസസ് ചെയ്യുന്നു. ആവശ്യമായ പ്രോസസിംഗ് സൈറ്റ് പ്രവർത്തിപ്പിക്കുന്നു. മറ്റ് ആവശ്യങ്ങൾക്ക് നിങ്ങളുടെ സമ്മതം വേണം; പിന്നീട് പിൻവലിക്കാം."],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "സൈറ്റ് പ്രവർത്തിപ്പിക്കാനും അളക്കാനും പരസ്യം ചെയ്യാനും കുക്കികൾ ഉപയോഗിക്കുന്നു. താഴെ വിൽപ്പന/ഷെയർ-ശൈലി പരസ്യവും വിശകലന കുക്കികളിൽ നിന്നും പുറത്തുകടക്കാം."],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "സൈറ്റ് പ്രവർത്തിപ്പിക്കാൻ ആവശ്യമായ കുക്കികൾ ഉപയോഗിക്കുന്നു. നിങ്ങൾ സമ്മതിച്ചാൽ സൈറ്റ് എങ്ങനെ ഉപയോഗിക്കുന്നുവെന്ന് മനസ്സിലാക്കാൻ വിശകലന കുക്കികളും ഉപയോഗിക്കും."],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "സൈറ്റ് പ്രവർത്തിക്കാൻ ആവശ്യമായ കുക്കികൾ ഉപയോഗിക്കുന്നു. നിങ്ങളുടെ സമ്മതത്തോടെ വിശകലനവും പരസ്യ കുക്കികളും ഉപയോഗിക്കും. അനാവശ്യ കുക്കികൾ നിരസിക്കുകയോ തിരഞ്ഞെടുപ്പ് മാറ്റുകയോ ചെയ്യാം."],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "സൈറ്റ് പ്രവർത്തിപ്പിക്കാൻ വേണ്ട കുക്കികൾ ഉപയോഗിക്കുന്നു. നിങ്ങളുടെ സമ്മതത്തോടെ മുൻഗണന ഓർക്കാനും ഉപയോഗം അളക്കാനും കുക്കികൾ ഉപയോഗിക്കും."],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "സൈറ്റ് പ്രവർത്തിപ്പിക്കാൻ ആവശ്യമായ കുക്കികൾ ഉപയോഗിക്കുന്നു. ഐച്ഛിക വിശകലനവും പരസ്യ കുക്കികളും നിങ്ങൾ സമ്മതിച്ചാൽ മാത്രം ഉപയോഗിക്കും."],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "ആവശ്യമായ കുക്കികൾ ചെക്ക്ഔട്ടും കാർട്ടും പ്രവർത്തിപ്പിക്കുന്നു. മറ്റ് കുക്കികൾ മുൻഗണന ഓർത്ത്, സന്ദർശനം അളന്ന്, നിങ്ങൾ സമ്മതിച്ചാൽ ബന്ധപ്പെട്ട ഓഫറുകൾ കാണിക്കുന്നു."],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "സൈറ്റ് പ്രവർത്തിപ്പിക്കാൻ ആവശ്യമായ കുക്കികൾ ഉപയോഗിക്കുന്നു. നിങ്ങളുടെ സമ്മതത്തോടെ വായനക്കാരുടെ എണ്ണം അളന്ന്, ഉള്ളടക്കം വ്യക്തിഗതമാക്കി, പരസ്യം കൊണ്ട് സൈറ്റ് നടത്തുന്നു."],
  ],
  pa: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "ਇਹ ਸਾਈਟ ਚਲਾਉਣ ਲਈ ਅਸੀਂ ਕੂਕੀਜ਼ ਅਤੇ ਮਿਲਦੀਆਂ ਤਕਨੀਕਾਂ ਵਰਤਦੇ ਹਾਂ, ਅਤੇ ਤੁਹਾਡੀ ਇਜਾਜ਼ਤ ਨਾਲ ਵਰਤੋਂ ਮਾਪਦੇ ਅਤੇ ਸਬੰਧਤ ਸਮੱਗਰੀ ਵਿਖਾਉਂਦੇ ਹਾਂ।"],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "ਸਾਈਟ ਚਲਾਉਣ ਲਈ ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ। ਤੁਹਾਡੀ ਸਹਿਮਤੀ ਨਾਲ ਵਿਸ਼ਲੇਸ਼ਣ ਅਤੇ ਵਿਗਿਆਪਨ ਕੂਕੀਜ਼ ਵੀ ਵਰਤੀਆਂ ਜਾਂਦੀਆਂ ਹਨ। ਤੁਸੀਂ ਚੋਣ ਕਦੇ ਵੀ ਬਦਲ ਸਕਦੇ ਹੋ।"],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "ਇੱਥੇ ਦੱਸੇ ਮਕਸਦਾਂ ਲਈ ਅਸੀਂ ਨਿੱਜੀ ਡਾਟਾ ਪ੍ਰਕਿਰਿਆ ਕਰਦੇ ਹਾਂ। ਲੋੜੀਂਦੀ ਪ੍ਰਕਿਰਿਆ ਸਾਈਟ ਚਾਲੂ ਰੱਖਦੀ ਹੈ। ਹੋਰ ਮਕਸਦਾਂ ਲਈ ਤੁਹਾਡੀ ਸਹਿਮਤੀ ਚਾਹੀਦੀ ਹੈ, ਜੋ ਬਾਅਦ ਵਿੱਚ ਵਾਪਸ ਲਈ ਜਾ ਸਕਦੀ ਹੈ।"],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "ਸਾਈਟ ਚਲਾਉਣ ਅਤੇ ਮਾਪਣ ਤੇ ਇਸ਼ਤਿਹਾਰ ਲਈ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ। ਹੇਠਾਂ ਵਿਕਰੀ/ਸਾਂਝ-ਸ਼ੈਲੀ ਇਸ਼ਤਿਹਾਰ ਅਤੇ ਵਿਸ਼ਲੇਸ਼ਣ ਕੂਕੀਜ਼ ਤੋਂ ਤੁਸੀਂ ਬਾਹਰ ਨਿਕਲ ਸਕਦੇ ਹੋ।"],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "ਸਾਈਟ ਚਲਾਉਣ ਲਈ ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ। ਜੇ ਤੁਸੀਂ ਸਹਿਮਤ ਹੋ ਤਾਂ ਸਾਈਟ ਕਿਵੇਂ ਵਰਤੀ ਜਾਂਦੀ ਹੈ ਸਮਝਣ ਲਈ ਵਿਸ਼ਲੇਸ਼ਣ ਕੂਕੀਜ਼ ਵੀ ਵਰਤਦੇ ਹਾਂ।"],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "ਸਾਈਟ ਚਲਾਉਣ ਲਈ ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ। ਤੁਹਾਡੀ ਸਹਿਮਤੀ ਨਾਲ ਵਿਸ਼ਲੇਸ਼ਣ ਅਤੇ ਵਿਗਿਆਪਨ ਕੂਕੀਜ਼ ਵੀ ਵਰਤੀਆਂ ਜਾਂਦੀਆਂ ਹਨ। ਗੈਰ-ਜ਼ਰੂਰੀ ਕੂਕੀਜ਼ ਰੱਦ ਕਰ ਸਕਦੇ ਹੋ ਜਾਂ ਚੋਣ ਬਦਲ ਸਕਦੇ ਹੋ।"],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "ਸਾਈਟ ਚਲਾਉਣ ਲਈ ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ। ਤੁਹਾਡੀ ਸਹਿਮਤੀ ਨਾਲ ਪਸੰਦ ਯਾਦ ਰੱਖਣ ਅਤੇ ਵਰਤੋਂ ਮਾਪਣ ਲਈ ਵੀ ਕੂਕੀਜ਼ ਵਰਤੀਆਂ ਜਾਂਦੀਆਂ ਹਨ।"],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "ਸਾਈਟ ਚਲਾਉਣ ਲਈ ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ। ਵਿਕਲਪਿਕ ਵਿਸ਼ਲੇਸ਼ਣ ਅਤੇ ਵਿਗਿਆਪਨ ਕੂਕੀਜ਼ ਤਾਂ ਹੀ ਵਰਤੀਆਂ ਜਾਂਦੀਆਂ ਹਨ ਜੇ ਤੁਸੀਂ ਸਹਿਮਤ ਹੋ।"],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਚੈੱਕਆਊਟ ਅਤੇ ਕਾਰਟ ਚਾਲੂ ਰੱਖਦੀਆਂ ਹਨ। ਹੋਰ ਕੂਕੀਜ਼ ਪਸੰਦ ਯਾਦ ਰੱਖਦੀਆਂ, ਮੁਲਾਕਾਤਾਂ ਮਾਪਦੀਆਂ ਅਤੇ ਜੇ ਤੁਸੀਂ ਸਹਿਮਤ ਹੋ ਤਾਂ ਸਬੰਧਤ ਪੇਸ਼ਕਸ਼ਾਂ ਵਿਖਾਉਂਦੀਆਂ ਹਨ।"],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "ਸਾਈਟ ਚਲਾਉਣ ਲਈ ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਵਰਤਦੇ ਹਾਂ। ਤੁਹਾਡੀ ਸਹਿਮਤੀ ਨਾਲ ਪਾਠਕ ਗਿਣਤੀ ਮਾਪਦੇ, ਸਮੱਗਰੀ ਨਿੱਜੀ ਕਰਦੇ ਅਤੇ ਇਸ਼ਤਿਹਾਰ ਨਾਲ ਸਾਈਟ ਚਲਾਉਂਦੇ ਹਾਂ।"],
  ],
  ur: [
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "ہم یہ سائٹ چلانے کے لیے کوکیز اور ملتی جلتی ٹیکنالوجی استعمال کرتے ہیں، اور آپ کی اجازت سے استعمال ناپتے اور متعلقہ مواد دکھاتے ہیں۔"],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "سائٹ چلانے کے لیے ضروری کوکیز استعمال کرتے ہیں۔ آپ کی رضامندی سے تجزیہ اور اشتہاری کوکیز بھی استعمال ہوتی ہیں۔ آپ اپنی پسند کسی بھی وقت بدل سکتے ہیں۔"],
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "یہاں بیان کردہ مقاصد کے لیے ہم ذاتی ڈیٹا پر کارروائی کرتے ہیں۔ ضروری کارروائی سائٹ چلاتی ہے۔ دیگر مقاصد کے لیے آپ کی رضامندی درکار ہے، جو بعد میں واپس لی جا سکتی ہے۔"],
    ["We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.", "سائٹ چلانے اور ناپنے و اشتہار کے لیے کوکیز استعمال کرتے ہیں۔ نیچے فروخت/شیئر طرز کے اشتہار اور تجزیاتی کوکیز سے آپ باہر نکل سکتے ہیں۔"],
    ["We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.", "سائٹ چلانے کے لیے ضروری کوکیز استعمال کرتے ہیں۔ اگر آپ متفق ہوں تو سائٹ کیسے استعمال ہوتی ہے سمجھنے کے لیے تجزیاتی کوکیز بھی استعمال کرتے ہیں۔"],
    ["We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.", "سائٹ چلانے کے لیے ضروری کوکیز استعمال کرتے ہیں۔ آپ کی رضامندی سے تجزیہ اور اشتہاری کوکیز بھی استعمال ہوتی ہیں۔ غیر ضروری کوکیز مسترد کر سکتے ہیں یا پسند بدل سکتے ہیں۔"],
    ["We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.", "سائٹ چلانے کے لیے درکار کوکیز استعمال کرتے ہیں۔ آپ کی رضامندی سے پسند یاد رکھنے اور استعمال ناپنے کی کوکیز بھی استعمال ہوتی ہیں۔"],
    ["We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.", "سائٹ چلانے کے لیے ضروری کوکیز استعمال کرتے ہیں۔ اختیاری تجزیہ اور اشتہاری کوکیز تبھی استعمال ہوتی ہیں جب آپ متفق ہوں۔"],
    ["Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.", "ضروری کوکیز چیک آؤٹ اور کارٹ چلاتی ہیں۔ دیگر کوکیز پسند یاد رکھتی، دورے ناپتی اور اگر آپ متفق ہوں تو متعلقہ آفرز دکھاتی ہیں۔"],
    ["We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.", "سائٹ چلانے کے لیے ضروری کوکیز استعمال کرتے ہیں۔ آپ کی رضامندی سے قارئین کی تعداد ناپتے، مواد ذاتی بناتے اور اشتہار سے سائٹ چلاتے ہیں۔"],
  ],
  as: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "ইয়াত কোৱা উদ্দেশ্যৰ বাবে আমি ব্যক্তিগত তথ্য প্ৰক্ৰিয়াকৰণ কৰোঁ। প্ৰয়োজনীয় প্ৰক্ৰিয়াকৰণে ছাইট চলাই ৰাখে। অন্য উদ্দেশ্যত আপোনাৰ সন্মতি লাগে, যি পিছত প্ৰত্যাহাৰ কৰিব পাৰি।"],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "ছাইট চলাবলৈ প্ৰয়োজনীয় কুকি ব্যৱহাৰ কৰোঁ। আপোনাৰ সন্মতিত বিশ্লেষণ আৰু বিজ্ঞাপন কুকিও ব্যৱহাৰ হয়। আপুনি যিকোনো সময়ত পছন্দ সলাব পাৰে।"],
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "এই ছাইট চলাবলৈ কুকি আৰু একেধৰণৰ প্ৰযুক্তি ব্যৱহাৰ কৰোঁ, আৰু আপোনাৰ অনুমতিত ব্যৱহাৰ জুখি প্ৰাসংগিক বিষয়বস্তু দেখুৱাওঁ।"],
  ],
  or: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "ଏଠାରେ କୁହାଯାଇଥିବା ଉଦ୍ଦେଶ୍ୟ ପାଇଁ ଆମେ ବ୍ୟକ୍ତିଗତ ତଥ୍ୟ ପ୍ରକ୍ରିୟା କରୁ। ଆବଶ୍ୟକ ପ୍ରକ୍ରିୟା ସାଇଟ୍ ଚାଳନା କରେ। ଅନ୍ୟ ଉଦ୍ଦେଶ୍ୟ ପାଇଁ ଆପଣଙ୍କ ସମ୍ମତି ଦରକାର, ଯାହା ପରେ ପ୍ରତ୍ୟାହାର କରିହେବ।"],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "ସାଇଟ୍ ଚାଳନା ପାଇଁ ଆବଶ୍ୟକ କୁକି ବ୍ୟବହାର କରୁ। ଆପଣଙ୍କ ସମ୍ମତିରେ ବିଶ୍ଳେଷଣ ଏବଂ ବିଜ୍ଞାପନ କୁକି ମଧ୍ୟ ବ୍ୟବହୃତ ହୁଏ। ଆପଣ ଯେକୌଣସି ସମୟରେ ପସନ୍ଦ ବଦଳାଇପାରିବେ।"],
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "ଏହି ସାଇଟ୍ ଚାଳନା ପାଇଁ କୁକି ଏବଂ ସମାନ ପ୍ରଯୁକ୍ତି ବ୍ୟବହାର କରୁ, ଏବଂ ଆପଣଙ୍କ ଅନୁମତିରେ ବ୍ୟବହାର ମାପି ପ୍ରାସଙ୍ଗିକ ବିଷୟବସ୍ତୁ ଦେଖାଉ।"],
  ],
  ne: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "यहाँ उल्लेखित उद्देश्यका लागि हामी व्यक्तिगत डाटा प्रशोधन गर्छौं। आवश्यक प्रशोधनले साइट चलाउँछ। अन्य उद्देश्यका लागि तपाईंको सहमति चाहिन्छ, जुन पछि फिर्ता लिन सकिन्छ।"],
    ["We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.", "साइट चलाउन आवश्यक कुकीहरू प्रयोग गर्छौं। तपाईंको सहमतिमा विश्लेषण र विज्ञापन कुकीहरू पनि प्रयोग हुन्छन्। तपाईं जुनसुकै बेला छनोट परिवर्तन गर्न सक्नुहुन्छ।"],
    ["We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.", "यो साइट चलाउन कुकी र समान प्रविधि प्रयोग गर्छौं, र तपाईंको अनुमतिमा प्रयोग नाप्छौं तथा सम्बन्धित सामग्री देखाउँछौं।"],
  ],
  sa: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "अत्र उक्तानां प्रयोजनानां कृते वयं वैयक्तिकदत्तांशं संसाधयामः। आवश्यकसंस्करणं स्थलं चालयति। अन्यप्रयोजनेषु भवतः सम्मतिः अपेक्षिता, या पश्चात् अपाकर्तुं शक्यते।"],
  ],
  kok: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "हांंगा सांगिल्ल्या हेतूं खातीर आमी वैयक्तिक डेटा प्रक्रिया करतात. गरजेची प्रक्रिया साइट चालू दवरता. हेर हेतूं खातीर तुमची संमती जाय, जी मागीर काडून घेवंक जाता."],
  ],
  mai: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "एतय कहल उद्देश्यक लेल हम व्यक्तिगत डेटा प्रक्रिया करैत छी। आवश्यक प्रक्रिया साइट चालू राखैत अछि। दोसर उद्देश्यक लेल अहाँक सहमति चाही, जे बाद मे वापस लए सकैत छी।"],
  ],
  doi: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "इत्थें दस्से मकसदां लेई अस निजी डेटा प्रोसेस करदे हां। जरूरी प्रोसेसिंग साइट चलदी ऐ। होर मकसदां लेई तुंदी सहमती चाहिदी ऐ, जेह्ड़ी बाद च वापस लैती जा सकदी ऐ।"],
  ],
  ks: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "یتھ مقصدن باپتھ چھِ أسۍ ذاتی ڈیٹا کاروٲئی کران۔ ضروٗری کاروٲئی چھِ سائٹ چلاوان۔ بیٚین مقصدن باپتھ چھِ تُہنٛز رضامندی ضروٗر، یۄس پتہٕ واپس ہٮ۪تھ ہٮ۪کو۔"],
  ],
  sd: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "هتي ٻڌايل مقصدن لاءِ اسان ذاتي ڊيٽا پروسيس ڪريون ٿا. ضروري پروسيسنگ سائيٽ هلائي ٿي. ٻين مقصدن لاءِ توهان جي رضامندي گهرجي، جيڪا پوءِ واپس وٺي سگهجي ٿي."],
  ],
  sat: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "ᱱᱚᱸᱰᱮ ᱞᱟᱹᱭ ᱟᱠᱟᱱ ᱠᱟᱹᱢᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱞᱮ ᱱᱤᱡᱮᱨᱟᱜ ᱰᱟᱴᱟ ᱠᱟᱹᱢᱤ ᱫᱚᱦᱚᱭᱟ᱾ ᱞᱟᱹᱠᱛᱤ ᱠᱟᱹᱢᱤ ᱥᱟᱭᱤᱴ ᱪᱟᱞᱟᱣᱟ᱾ ᱮᱴᱟᱜ ᱠᱟᱹᱢᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱢᱟᱜ ᱥᱤᱠᱟᱹᱨ ᱞᱟᱹᱠᱛᱤ, ᱚᱠᱟ ᱛᱟᱭᱚᱢ ᱨᱩᱣᱟᱹᱲ ᱫᱟᱲᱮᱭᱟᱜ-ᱟ᱾"],
  ],
  mni: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "মফম অসিদা হাইরক্লিবা থৌদাংশিংগি দমক ঐখোয়না মরু ওইবা ডাটা প্রোসেস তৌই। মথৌ তাইবা প্রোসেসিংনা সায়িট পাই। অতোপ্পা থৌদাংদা নহাক্কী অয়াবা তাই, মদু পাঙথোক্লগা হল্লিবা ঙমই।"],
  ],
  brx: [
    ["We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.", "बेयाव खिन्थाय जानाय हानजाफोरनि थाखाय जों गावनि डाटा प्रोसेस खालामो। गोनां प्रोसेसिंआ साइट सालायो। गुबुन हानजाफोरनि थाखाय नोंथांनि सहमति नांगौ, जाय उनाव फैनाय जायो।"],
  ],
};

for (const [locale, pairs] of Object.entries(TITLE_I18N)) {
  POLICY_TITLES[locale] = Object.fromEntries(pairs);
}
for (const [locale, pairs] of Object.entries(BODY_I18N)) {
  POLICY_BODIES[locale] = Object.fromEntries(pairs);
}

export const EXTRA_UI: Record<string, ExtraBannerUiStrings> = {
  hi: {
    cookiePreferences: "कुकी प्राथमिकताएँ",
    ageRestricted: "आयु-सीमित",
    newTag: "नया",
    status: "स्थिति:",
    consentGiven: "सहमति दी गई:",
    expires: "समाप्ति:",
    consentKey: "कुंजी:",
    activeCategories: "सक्रिय श्रेणियाँ:",
    downloadReceipt: "रसीद डाउनलोड करें",
    revokeConsent: "सहमति वापस लें (DPDP धारा 6(4))",
    doNotTrack: "आपके ब्राउज़र ने Do Not Track अनुरोध भेजा है। स्वीकार करने तक वैकल्पिक कुकीज़ बंद रहेंगी।",
    parentalBody2:
      "कोई विश्लेषण, विपणन या व्यवहार ट्रैकिंग डेटा एकत्र नहीं होगा। यदि अभिभावक आपकी ओर से सहमति देना चाहें तो हमारे डेटा संरक्षण अधिकारी से संपर्क करें।",
    essentialOnly: "केवल आवश्यक",
    fullConsent: "पूर्ण सहमति",
    customConsent: "अनुकूलित",
    required: "आवश्यक",
  },
  bn: {
    cookiePreferences: "কুকি পছন্দ",
    ageRestricted: "বয়স-সীমিত",
    newTag: "নতুন",
    status: "স্থিতি:",
    consentGiven: "সম্মতি দেওয়া:",
    expires: "মেয়াদ:",
    consentKey: "কী:",
    activeCategories: "সক্রিয় বিভাগ:",
    downloadReceipt: "রসিদ ডাউনলোড",
    revokeConsent: "সম্মতি প্রত্যাহার (DPDP ধারা ৬(৪))",
    doNotTrack: "আপনার ব্রাউজার Do Not Track অনুরোধ পাঠিয়েছে। আপনি গ্রহণ না করা পর্যন্ত ঐচ্ছিক কুকি বন্ধ থাকবে।",
    parentalBody2: "কোনো বিশ্লেষণ, বিপণন বা আচরণগত ট্র্যাকিং তথ্য সংগ্রহ হবে না। অভিভাবক সম্মতি দিতে চাইলে আমাদের ডেটা সুরক্ষা কর্মকর্তার সাথে যোগাযোগ করুন।",
    essentialOnly: "শুধু প্রয়োজনীয়",
    fullConsent: "পূর্ণ সম্মতি",
    customConsent: "কাস্টম",
    required: "আবশ্যক",
  },
  ta: {
    cookiePreferences: "குக்கீ விருப்பங்கள்",
    ageRestricted: "வயது வரம்பு",
    newTag: "புதியது",
    status: "நிலை:",
    consentGiven: "ஒப்புதல் அளிக்கப்பட்டது:",
    expires: "காலாவதி:",
    consentKey: "சாவி:",
    activeCategories: "செயலில் உள்ள பிரிவுகள்:",
    downloadReceipt: "ரசீதைப் பதிவிறக்கவும்",
    revokeConsent: "ஒப்புதலைத் திரும்பப் பெறவும் (DPDP பிரிவு 6(4))",
    doNotTrack: "உங்கள் உலாவி Do Not Track கோரிக்கை அனுப்பியுள்ளது. நீங்கள் ஏற்கும் வரை விருப்ப குக்கீகள் அணைக்கப்பட்டிருக்கும்.",
    parentalBody2: "பகுப்பாய்வு, சந்தைப்படுத்தல் அல்லது நடத்தை தரவு சேகரிக்கப்படாது. பெற்றோர் ஒப்புதல் அளிக்க விரும்பினால் எங்கள் தரவு பாதுகாப்பு அலுவலரைத் தொடர்பு கொள்ளவும்.",
    essentialOnly: "அத்தியாவசியம் மட்டும்",
    fullConsent: "முழு ஒப்புதல்",
    customConsent: "தனிப்பயன்",
    required: "அவசியம்",
  },
  ur: {
    cookiePreferences: "کوکی ترجیحات",
    ageRestricted: "عمر محدود",
    newTag: "نیا",
    status: "صورت حال:",
    consentGiven: "رضامندی دی گئی:",
    expires: "ختم:",
    consentKey: "کنجی:",
    activeCategories: "فعال زمرے:",
    downloadReceipt: "رسید ڈاؤن لوڈ کریں",
    revokeConsent: "رضامندی واپس لیں (DPDP دفعہ 6(4))",
    doNotTrack: "آپ کے براؤزر نے Do Not Track درخواست بھیجی ہے۔ قبول کرنے تک اختیاری کوکیز بند رہیں گی۔",
    parentalBody2: "کوئی تجزیہ، مارکیٹنگ یا رویے کا ڈیٹا جمع نہیں ہوگا۔ اگر سرپرست رضامندی دینا چاہیں تو ہمارے ڈیٹا پروٹیکشن آفیسر سے رابطہ کریں۔",
    essentialOnly: "صرف ضروری",
    fullConsent: "مکمل رضامندی",
    customConsent: "حسب ضرورت",
    required: "ضروری",
  },
};

export const LEGAL_BASIS: Record<string, Record<string, string>> = {
  hi: {
    consent: "सहमति",
    contract: "अनुबंध",
    legitimate_interests: "वैध हित",
    legal_obligation: "कानूनी बाध्यता",
    vital_interests: "अत्यावश्यक हित",
    public_task: "सार्वजनिक कार्य",
  },
  bn: {
    consent: "সম্মতি",
    contract: "চুক্তি",
    legitimate_interests: "বৈধ স্বার্থ",
    legal_obligation: "আইনি বাধ্যবাধকতা",
    vital_interests: "অত্যাবশ্যক স্বার্থ",
    public_task: "জনসাধারণের কাজ",
  },
  ur: {
    consent: "رضامندی",
    contract: "معاہدہ",
    legitimate_interests: "جائز مفاد",
    legal_obligation: "قانونی پابندی",
    vital_interests: "انتہائی مفاد",
    public_task: "عوامی کام",
  },
  ta: {
    consent: "ஒப்புதல்",
    contract: "ஒப்பந்தம்",
    legitimate_interests: "நியாயமான நலன்",
    legal_obligation: "சட்டக் கடமை",
    vital_interests: "அத்தியாவசிய நலன்",
    public_task: "பொதுப் பணி",
  },
  te: {
    consent: "సమ్మతి",
    contract: "ఒప్పందం",
    legitimate_interests: "చట్టబద్ధ ప్రయోజనం",
    legal_obligation: "చట్టపరమైన బాధ్యత",
    vital_interests: "అవసర ప్రయోజనం",
    public_task: "ప్రజా పని",
  },
  mr: {
    consent: "संमती",
    contract: "करार",
    legitimate_interests: "वैध हित",
    legal_obligation: "कायदेशीर बंधन",
    vital_interests: "अत्यावश्यक हित",
    public_task: "सार्वजनिक कार्य",
  },
  gu: {
    consent: "સંમતિ",
    contract: "કરાર",
    legitimate_interests: "કાયદેસર હિત",
    legal_obligation: "કાનૂની ફરજ",
    vital_interests: "આવશ્યક હિત",
    public_task: "જાહેર કામ",
  },
  kn: {
    consent: "ಸಮ್ಮತಿ",
    contract: "ಒಪ್ಪಂದ",
    legitimate_interests: "ಕಾನೂನುಬದ್ಧ ಹಿತ",
    legal_obligation: "ಕಾನೂನು ಬಾಧ್ಯತೆ",
    vital_interests: "ಅಗತ್ಯ ಹಿತ",
    public_task: "ಸಾರ್ವಜನಿಕ ಕಾರ್ಯ",
  },
  ml: {
    consent: "സമ്മതം",
    contract: "കരാർ",
    legitimate_interests: "നിയമാനുസൃത താൽപ്പര്യം",
    legal_obligation: "നിയമ ബാധ്യത",
    vital_interests: "അനിവാര്യ താൽപ്പര്യം",
    public_task: "പൊതുപ്രവൃത്തി",
  },
  pa: {
    consent: "ਸਹਿਮਤੀ",
    contract: "ਇਕਰਾਰਨਾਮਾ",
    legitimate_interests: "ਕਾਨੂੰਨੀ ਹਿੱਤ",
    legal_obligation: "ਕਾਨੂੰਨੀ ਫਰਜ਼",
    vital_interests: "ਜ਼ਰੂਰੀ ਹਿੱਤ",
    public_task: "ਲੋਕ ਕਾਰਜ",
  },
};

const catalogCache = new Map<string, Record<string, string>>();
const PURPOSE_ALIASES: Record<string, PurposeFamily> = {
  Essential: "essential",
  Marketing: "marketing",
  Statistics: "analytics",
  Ads: "marketing",
};
const PREVIEW_PURPOSE_DESCRIPTIONS: Record<string, PurposeFamily> = {
  "Required for security, login, and storing this consent choice.": "essential",
  "Remembers language, region, and other site preferences.": "functionality",
  "Helps us understand how visitors use the site so we can improve it.": "analytics",
  "Used to show relevant ads and measure campaigns.": "marketing",
  "Shows more relevant content and recommendations.": "personalization",
};

export function catalogForLocale(locale: string): Record<string, string> {
  const key = localeKey(locale);
  const cached = catalogCache.get(key);
  if (cached) return cached;
  const out: Record<string, string> = {
    ...(POLICY_TITLES[key] ?? {}),
    ...(POLICY_BODIES[key] ?? {}),
  };
  const purposes = PURPOSE_PACKS[key];
  if (purposes) {
    (Object.keys(ENGLISH_PURPOSE_PACKS) as PurposeFamily[]).forEach((family) => {
      out[ENGLISH_PURPOSE_PACKS[family].name] = purposes[family].name;
      out[ENGLISH_PURPOSE_PACKS[family].description] = purposes[family].description;
    });
    for (const [alias, family] of Object.entries(PURPOSE_ALIASES)) {
      out[alias] = purposes[family].name;
    }
    for (const [english, family] of Object.entries(PREVIEW_PURPOSE_DESCRIPTIONS)) {
      out[english] = purposes[family].description;
    }
  }
  catalogCache.set(key, out);
  return out;
}

export const NOTICE_TEXT_CATALOG: Record<string, Record<string, string>> = {};
for (const locale of Object.keys(PURPOSE_PACKS)) {
  for (const [english, translated] of Object.entries(catalogForLocale(locale))) {
    if (!NOTICE_TEXT_CATALOG[english]) NOTICE_TEXT_CATALOG[english] = {};
    NOTICE_TEXT_CATALOG[english][locale] = translated;
  }
}

export function translateCatalogString(english: string | null | undefined, locale: string): string | undefined {
  const text = typeof english === "string" ? english.trim() : "";
  if (!text) return undefined;
  const key = localeKey(locale);
  if (key === "en") return undefined;
  return catalogForLocale(key)[text];
}

export function purposeCopyForLocale(
  purpose: { key?: string | null; name?: string | null },
  locale: string,
): PurposeFamilyCopy | undefined {
  const key = localeKey(locale);
  if (key === "en") return undefined;
  const pack = PURPOSE_PACKS[key];
  if (!pack) return undefined;
  const family =
    (purposeKeyFamily(purpose.key) as PurposeFamily | null) ??
    (PURPOSE_NAME_FAMILY[String(purpose.name ?? "").trim().toLowerCase()] as PurposeFamily | undefined) ??
    (PURPOSE_NAME_FAMILY[String(purpose.key ?? "").trim().toLowerCase()] as PurposeFamily | undefined);
  if (!family || !pack[family]) return undefined;
  return pack[family];
}

const PURPOSE_NAME_FAMILY: Record<string, PurposeFamily> = {
  necessary: "essential",
  essential: "essential",
  required: "essential",
  security: "essential",
  functional: "functionality",
  functionality: "functionality",
  analytics: "analytics",
  statistics: "analytics",
  measurement: "analytics",
  advertising: "marketing",
  marketing: "marketing",
  ads: "marketing",
  targeting: "marketing",
  personalization: "personalization",
  preferences: "personalization",
};

function isKnownPurposeName(name: string | null | undefined): boolean {
  const text = String(name ?? "").trim();
  if (!text) return false;
  if (PURPOSE_NAME_FAMILY[text.toLowerCase()]) return true;
  return (Object.values(ENGLISH_PURPOSE_PACKS) as PurposeFamilyCopy[]).some((pack) => pack.name === text);
}

function isKnownPurposeDescription(description: string | null | undefined): boolean {
  const text = String(description ?? "").trim();
  if (!text) return false;
  if (PREVIEW_PURPOSE_DESCRIPTIONS[text]) return true;
  return (Object.values(ENGLISH_PURPOSE_PACKS) as PurposeFamilyCopy[]).some((pack) => pack.description === text);
}

export function localizePurposeCopy(
  purpose: { key: string; name: string; description?: string | null },
  locale: string,
  operator?: { name?: string; description?: string },
): { name: string; description: string | null } {
  const familyCopy = purposeCopyForLocale(purpose, locale);
  const name =
    (typeof operator?.name === "string" && operator.name.trim()) ||
    translateCatalogString(purpose.name, locale) ||
    (familyCopy && isKnownPurposeName(purpose.name) ? familyCopy.name : undefined) ||
    purpose.name;
  const description =
    (typeof operator?.description === "string" && operator.description.trim()) ||
    translateCatalogString(purpose.description, locale) ||
    (familyCopy && isKnownPurposeDescription(purpose.description) ? familyCopy.description : undefined) ||
    purpose.description ||
    null;
  return { name, description };
}

export function extraUiStringsForLocale(locale: string): ExtraBannerUiStrings {
  const key = localeKey(locale);
  if (key === "en") return DEFAULT_EXTRA_UI;
  return EXTRA_UI[key] ?? DEFAULT_EXTRA_UI;
}

export function legalBasisLabel(value: string | null | undefined, locale: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const key = localeKey(locale);
  const pack = key === "en" ? undefined : LEGAL_BASIS[key];
  return pack?.[raw] ?? pack?.[raw.replaceAll(" ", "_")] ?? raw.replaceAll("_", " ");
}
