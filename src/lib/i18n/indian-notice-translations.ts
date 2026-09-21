import { languageOf, normalizeLocaleTag } from "./locale-registry";
import type { NoticeStrings } from "./resolve-notice";

export type BannerUiStrings = {
  dataPrincipalRights: string;
  under18: string;
  ageConfirmStart: string;
  ageConfirmStrong: string;
  ageConfirmEnd: string;
  cookiePolicy: string;
  language: string;
  parentalTitle: string;
  parentalBody: string;
};

const LOCALE_ALIASES: Record<string, string> = { bodo: "brx" };

export const INDIAN_LOCALE_NATIVE_LABELS: Record<string, string> = {
  en: "English",
  as: "অসমীয়া",
  bn: "বাংলা",
  brx: "बर'",
  bodo: "बर'",
  doi: "डोगरी",
  gu: "ગુજરાતી",
  hi: "हिन्दी",
  kn: "ಕನ್ನಡ",
  ks: "کٲشُر",
  kok: "कोंकणी",
  mai: "मैथिली",
  ml: "മലയാളം",
  mni: "ꯃꯤꯇꯩꯂꯣꯟ",
  mr: "मराठी",
  ne: "नेपाली",
  or: "ଓଡ଼ିଆ",
  pa: "ਪੰਜਾਬੀ",
  sa: "संस्कृतम्",
  sat: "ᱥᱟᱱᱛᱟᱲᱤ",
  sd: "سنڌي",
  ta: "தமிழ்",
  te: "తెలుగు",
  ur: "اردو",
};

export const DEFAULT_BANNER_UI_STRINGS: BannerUiStrings = {
  dataPrincipalRights: "Data Principal Rights",
  under18: "I am under 18",
  ageConfirmStart: "By choosing Accept or Reject below, you confirm you are ",
  ageConfirmStrong: "18 years or older",
  ageConfirmEnd: " per DPDP Act, Section 9. ",
  cookiePolicy: "Cookie Policy",
  language: "Language",
  parentalTitle: "Parental Consent Required",
  parentalBody:
    "Under DPDP Act Section 9, processing personal data of individuals under 18 requires verifiable parental or guardian consent. We have automatically limited data collection to only essential cookies required for the website to function.",
};

export const INDIAN_NOTICE_PACKS: Record<string, NoticeStrings> = {
  hi: {
    title: "आपकी गोपनीयता हमारे लिए महत्वपूर्ण है",
    description:
      "हम आपके ब्राउज़िंग अनुभव को बेहतर बनाने, व्यक्तिगत सामग्री दिखाने और ट्रैफ़िक का विश्लेषण करने के लिए कुकीज़ और समान तकनीकों का उपयोग करते हैं। \"सभी स्वीकार करें\" पर क्लिक करके आप कुकीज़ के उपयोग के लिए सहमति देते हैं।",
    acceptAllLabel: "सभी स्वीकार करें",
    rejectAllLabel: "सभी अस्वीकार करें",
    customizeLabel: "अनुकूलित करें",
    savePreferencesLabel: "प्राथमिकताएँ सहेजें",
    privacyPolicyText: "गोपनीयता नीति",
    closeLabel: "बंद करें",
    preferenceCenterTitle: "अपनी प्राथमिकताएँ प्रबंधित करें",
    preferenceCenterDescription:
      "चुनें कि किन उद्देश्यों और विक्रेताओं को आप अनुमति देते हैं। आप अपनी पसंद कभी भी बदल सकते हैं।",
    purposesHeading: "उद्देश्य",
    vendorsHeading: "विक्रेता",
    requiredLabel: "आवश्यक",
  },
  bn: {
    title: "আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ",
    description:
      "আমরা আপনার ব্রাউজিং অভিজ্ঞতা উন্নত করতে, ব্যক্তিগতকৃত বিষয়বস্তু দেখাতে এবং ট্রাফিক বিশ্লেষণ করতে কুকি ও অনুরূপ প্রযুক্তি ব্যবহার করি। \"সব গ্রহণ করুন\" ক্লিক করে আপনি কুকি ব্যবহারের সম্মতি দিচ্ছেন।",
    acceptAllLabel: "সব গ্রহণ করুন",
    rejectAllLabel: "সব প্রত্যাখ্যান করুন",
    customizeLabel: "কাস্টমাইজ করুন",
    savePreferencesLabel: "পছন্দ সংরক্ষণ করুন",
    privacyPolicyText: "গোপনীয়তা নীতি",
    closeLabel: "বন্ধ করুন",
    preferenceCenterTitle: "আপনার পছন্দ পরিচালনা করুন",
    preferenceCenterDescription:
      "কোন উদ্দেশ্য ও বিক্রেতাদের আপনি অনুমতি দেবেন তা বেছে নিন। আপনি যেকোনো সময় আপনার পছন্দ পরিবর্তন করতে পারেন।",
    purposesHeading: "উদ্দেশ্য",
    vendorsHeading: "বিক্রেতা",
    requiredLabel: "আবশ্যক",
  },
  ta: {
    title: "உங்கள் தனியுரிமை எங்களுக்கு முக்கியம்",
    description:
      "உங்கள் உலாவல் அனுபவத்தை மேம்படுத்தவும், தனிப்பயன் உள்ளடக்கத்தை வழங்கவும், போக்குவரத்தை பகுப்பாய்வு செய்யவும் நாங்கள் குக்கீகள் மற்றும் ஒத்த தொழில்நுட்பங்களைப் பயன்படுத்துகிறோம். \"அனைத்தையும் ஏற்கவும்\" என்பதைக் கிளிக் செய்வதன் மூலம் குக்கீ பயன்பாட்டிற்கு நீங்கள் ஒப்புக்கொள்கிறீர்கள்.",
    acceptAllLabel: "அனைத்தையும் ஏற்கவும்",
    rejectAllLabel: "அனைத்தையும் நிராகரிக்கவும்",
    customizeLabel: "விருப்பமைக்கவும்",
    savePreferencesLabel: "விருப்பங்களைச் சேமிக்கவும்",
    privacyPolicyText: "தனியுரிமைக் கொள்கை",
    closeLabel: "மூடு",
    preferenceCenterTitle: "உங்கள் விருப்பங்களை நிர்வகிக்கவும்",
    preferenceCenterDescription:
      "எந்த நோக்கங்கள் மற்றும் விற்பனையாளர்களை அனுமதிக்கிறீர்கள் என்பதைத் தேர்ந்தெடுக்கவும். உங்கள் தேர்வுகளை எப்போதும் மாற்றலாம்.",
    purposesHeading: "நோக்கங்கள்",
    vendorsHeading: "விற்பனையாளர்கள்",
    requiredLabel: "அவசியம்",
  },
  te: {
    title: "మీ గోప్యత మాకు ముఖ్యం",
    description:
      "మీ బ్రౌజింగ్ అనుభవాన్ని మెరుగుపరచడానికి, వ్యక్తిగత కంటెంట్ అందించడానికి మరియు ట్రాఫిక్‌ను విశ్లేషించడానికి మేము కుకీలు మరియు సారూప్య సాంకేతికతలను ఉపయోగిస్తాము. \"అన్నీ అంగీకరించండి\" క్లిక్ చేయడం ద్వారా కుకీల వాడకానికి మీరు సమ్మతిస్తారు.",
    acceptAllLabel: "అన్నీ అంగీకరించండి",
    rejectAllLabel: "అన్నీ తిరస్కరించండి",
    customizeLabel: "అనుకూలీకరించండి",
    savePreferencesLabel: "ప్రాధాన్యతలను సేవ్ చేయండి",
    privacyPolicyText: "గోప్యతా విధానం",
    closeLabel: "మూసివేయి",
    preferenceCenterTitle: "మీ ప్రాధాన్యతలను నిర్వహించండి",
    preferenceCenterDescription:
      "మీరు ఏ ప్రయోజనాలు మరియు విక్రేతలను అనుమతిస్తారో ఎంచుకోండి. మీ ఎంపికలను ఎప్పుడైనా మార్చుకోవచ్చు.",
    purposesHeading: "ప్రయోజనాలు",
    vendorsHeading: "విక్రేతలు",
    requiredLabel: "అవసరం",
  },
  mr: {
    title: "तुमची गोपनीयता आमच्यासाठी महत्त्वाची आहे",
    description:
      "तुमचा ब्राउझिंग अनुभव सुधारण्यासाठी, वैयक्तिक सामग्री दाखवण्यासाठी आणि रहदारीचे विश्लेषण करण्यासाठी आम्ही कुकीज आणि तत्सम तंत्रज्ञान वापरतो. \"सर्व स्वीकारा\" क्लिक करून तुम्ही कुकीज वापरण्यास संमती देता.",
    acceptAllLabel: "सर्व स्वीकारा",
    rejectAllLabel: "सर्व नाकारा",
    customizeLabel: "सानुकूलित करा",
    savePreferencesLabel: "प्राधान्ये जतन करा",
    privacyPolicyText: "गोपनीयता धोरण",
    closeLabel: "बंद करा",
    preferenceCenterTitle: "तुमची प्राधान्ये व्यवस्थापित करा",
    preferenceCenterDescription:
      "कोणत्या उद्देशांना आणि विक्रेत्यांना तुम्ही परवानगी देता ते निवडा. तुम्ही तुमच्या निवडी कधीही बदलू शकता.",
    purposesHeading: "उद्देश",
    vendorsHeading: "विक्रेते",
    requiredLabel: "आवश्यक",
  },
  gu: {
    title: "તમારી ગોપનીયતા અમારા માટે મહત્વની છે",
    description:
      "અમે તમારા બ્રાઉઝિંગ અનુભવને સુધારવા, વ્યક્તિગત સામગ્રી બતાવવા અને ટ્રાફિકનું વિશ્લેષણ કરવા કુકીઝ અને સમાન તકનીકોનો ઉપયોગ કરીએ છીએ. \"બધું સ્વીકારો\" ક્લિક કરીને તમે કુકીઝના ઉપયોગ માટે સંમતિ આપો છો.",
    acceptAllLabel: "બધું સ્વીકારો",
    rejectAllLabel: "બધું નકારો",
    customizeLabel: "કસ્ટમાઇઝ કરો",
    savePreferencesLabel: "પસંદગીઓ સાચવો",
    privacyPolicyText: "ગોપનીયતા નીતિ",
    closeLabel: "બંધ કરો",
    preferenceCenterTitle: "તમારી પસંદગીઓ મેનેજ કરો",
    preferenceCenterDescription:
      "કયા હેતુઓ અને વિક્રેતાઓને તમે મંજૂરી આપો છો તે પસંદ કરો. તમે તમારી પસંદગી કોઈપણ સમયે બદલી શકો છો.",
    purposesHeading: "હેતુઓ",
    vendorsHeading: "વિક્રેતાઓ",
    requiredLabel: "જરૂરી",
  },
  kn: {
    title: "ನಿಮ್ಮ ಗೌಪ್ಯತೆ ನಮಗೆ ಮುಖ್ಯ",
    description:
      "ನಿಮ್ಮ ಬ್ರೌಸಿಂಗ್ ಅನುಭವವನ್ನು ಉತ್ತಮಗೊಳಿಸಲು, ವೈಯಕ್ತಿಕ ವಿಷಯವನ್ನು ತೋರಿಸಲು ಮತ್ತು ಟ್ರಾಫಿಕ್ ವಿಶ್ಲೇಷಿಸಲು ನಾವು ಕುಕೀಗಳು ಮತ್ತು ಇದೇ ತಂತ್ರಜ್ಞಾನಗಳನ್ನು ಬಳಸುತ್ತೇವೆ. \"ಎಲ್ಲವನ್ನೂ ಸ್ವೀಕರಿಸಿ\" ಕ್ಲಿಕ್ ಮಾಡುವ ಮೂಲಕ ನೀವು ಕುಕೀ ಬಳಕೆಗೆ ಸಮ್ಮತಿಸುತ್ತೀರಿ.",
    acceptAllLabel: "ಎಲ್ಲವನ್ನೂ ಸ್ವೀಕರಿಸಿ",
    rejectAllLabel: "ಎಲ್ಲವನ್ನೂ ನಿರಾಕರಿಸಿ",
    customizeLabel: "ಕಸ್ಟಮೈಸ್ ಮಾಡಿ",
    savePreferencesLabel: "ಆದ್ಯತೆಗಳನ್ನು ಉಳಿಸಿ",
    privacyPolicyText: "ಗೌಪ್ಯತಾ ನೀತಿ",
    closeLabel: "ಮುಚ್ಚಿ",
    preferenceCenterTitle: "ನಿಮ್ಮ ಆದ್ಯತೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ",
    preferenceCenterDescription:
      "ಯಾವ ಉದ್ದೇಶಗಳು ಮತ್ತು ಮಾರಾಟಗಾರರಿಗೆ ನೀವು ಅನುಮತಿ ನೀಡುತ್ತೀರಿ ಎಂಬುದನ್ನು ಆಯ್ಕೆಮಾಡಿ. ನಿಮ್ಮ ಆಯ್ಕೆಗಳನ್ನು ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಾಯಿಸಬಹುದು.",
    purposesHeading: "ಉದ್ದೇಶಗಳು",
    vendorsHeading: "ಮಾರಾಟಗಾರರು",
    requiredLabel: "ಅಗತ್ಯ",
  },
  ml: {
    title: "നിങ്ങളുടെ സ്വകാര്യത ഞങ്ങൾക്ക് പ്രധാനമാണ്",
    description:
      "നിങ്ങളുടെ ബ്രൗസിംഗ് അനുഭവം മെച്ചപ്പെടുത്താനും വ്യക്തിഗത ഉള്ളടക്കം നൽകാനും ട്രാഫിക് വിശകലനം ചെയ്യാനും ഞങ്ങൾ കുക്കികളും സമാന സാങ്കേതികവിദ്യകളും ഉപയോഗിക്കുന്നു. \"എല്ലാം അംഗീകരിക്കുക\" ക്ലിക്ക് ചെയ്ത് കുക്കി ഉപയോഗത്തിന് നിങ്ങൾ സമ്മതം നൽകുന്നു.",
    acceptAllLabel: "എല്ലാം അംഗീകരിക്കുക",
    rejectAllLabel: "എല്ലാം നിരസിക്കുക",
    customizeLabel: "ക്രമീകരിക്കുക",
    savePreferencesLabel: "മുൻഗണനകൾ സംരക്ഷിക്കുക",
    privacyPolicyText: "സ്വകാര്യതാ നയം",
    closeLabel: "അടയ്ക്കുക",
    preferenceCenterTitle: "നിങ്ങളുടെ മുൻഗണനകൾ നിയന്ത്രിക്കുക",
    preferenceCenterDescription:
      "ഏതൊക്കെ ലക്ഷ്യങ്ങൾക്കും വെണ്ടർമാർക്കും നിങ്ങൾ അനുമതി നൽകുന്നുവെന്ന് തിരഞ്ഞെടുക്കുക. നിങ്ങളുടെ തിരഞ്ഞെടുപ്പുകൾ എപ്പോൾ വേണമെങ്കിലും മാറ്റാം.",
    purposesHeading: "ലക്ഷ്യങ്ങൾ",
    vendorsHeading: "വെണ്ടർമാർ",
    requiredLabel: "ആവശ്യമാണ്",
  },
  pa: {
    title: "ਤੁਹਾਡੀ ਪਰਦੇਦਾਰੀ ਸਾਡੇ ਲਈ ਮਹੱਤਵਪੂਰਨ ਹੈ",
    description:
      "ਅਸੀਂ ਤੁਹਾਡੇ ਬ੍ਰਾਊਜ਼ਿੰਗ ਅਨੁਭਵ ਨੂੰ ਬਿਹਤਰ ਬਣਾਉਣ, ਵਿਅਕਤੀਗਤ ਸਮੱਗਰੀ ਦਿਖਾਉਣ ਅਤੇ ਟ੍ਰੈਫਿਕ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰਨ ਲਈ ਕੂਕੀਜ਼ ਅਤੇ ਇਸੇ ਤਰ੍ਹਾਂ ਦੀਆਂ ਤਕਨੀਕਾਂ ਵਰਤਦੇ ਹਾਂ। \"ਸਭ ਸਵੀਕਾਰ ਕਰੋ\" ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਤੁਸੀਂ ਕੂਕੀਜ਼ ਦੀ ਵਰਤੋਂ ਲਈ ਸਹਿਮਤੀ ਦਿੰਦੇ ਹੋ।",
    acceptAllLabel: "ਸਭ ਸਵੀਕਾਰ ਕਰੋ",
    rejectAllLabel: "ਸਭ ਅਸਵੀਕਾਰ ਕਰੋ",
    customizeLabel: "ਅਨੁਕੂਲ ਬਣਾਓ",
    savePreferencesLabel: "ਤਰਜੀਹਾਂ ਸੰਭਾਲੋ",
    privacyPolicyText: "ਪਰਦੇਦਾਰੀ ਨੀਤੀ",
    closeLabel: "ਬੰਦ ਕਰੋ",
    preferenceCenterTitle: "ਆਪਣੀਆਂ ਤਰਜੀਹਾਂ ਪ੍ਰਬੰਧਿਤ ਕਰੋ",
    preferenceCenterDescription:
      "ਚੁਣੋ ਕਿ ਕਿਹੜੇ ਉਦੇਸ਼ਾਂ ਅਤੇ ਵਿਕਰੇਤਾਵਾਂ ਨੂੰ ਤੁਸੀਂ ਇਜਾਜ਼ਤ ਦਿੰਦੇ ਹੋ। ਤੁਸੀਂ ਆਪਣੀ ਚੋਣ ਕਿਸੇ ਵੀ ਵੇਲੇ ਬਦਲ ਸਕਦੇ ਹੋ।",
    purposesHeading: "ਉਦੇਸ਼",
    vendorsHeading: "ਵਿਕਰੇਤਾ",
    requiredLabel: "ਲੋੜੀਂਦਾ",
  },
  or: {
    title: "ଆପଣଙ୍କ ଗୋପନୀୟତା ଆମ ପାଇଁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ",
    description:
      "ଆମେ ଆପଣଙ୍କ ବ୍ରାଉଜିଂ ଅଭିଜ୍ଞତା ଉନ୍ନତ କରିବା, ବ୍ୟକ୍ତିଗତ ବିଷୟବସ୍ତୁ ଦେଖାଇବା ଏବଂ ଟ୍ରାଫିକ୍ ବିଶ୍ଳେଷଣ କରିବା ପାଇଁ କୁକି ଏବଂ ସମାନ ପ୍ରଯୁକ୍ତି ବ୍ୟବହାର କରୁ। \"ସବୁ ଗ୍ରହଣ କରନ୍ତୁ\" କ୍ଲିକ୍ କରି ଆପଣ କୁକି ବ୍ୟବହାର ପାଇଁ ସମ୍ମତି ଦେଉଛନ୍ତି।",
    acceptAllLabel: "ସବୁ ଗ୍ରହଣ କରନ୍ତୁ",
    rejectAllLabel: "ସବୁ ପ୍ରତ୍ୟାଖ୍ୟାନ କରନ୍ତୁ",
    customizeLabel: "କଷ୍ଟମାଇଜ୍ କରନ୍ତୁ",
    savePreferencesLabel: "ପସନ୍ଦ ସଂରକ୍ଷଣ କରନ୍ତୁ",
    privacyPolicyText: "ଗୋପନୀୟତା ନୀତି",
    closeLabel: "ବନ୍ଦ କରନ୍ତୁ",
    preferenceCenterTitle: "ଆପଣଙ୍କ ପସନ୍ଦ ପରିଚାଳନା କରନ୍ତୁ",
    preferenceCenterDescription:
      "କେଉଁ ଉଦ୍ଦେଶ୍ୟ ଏବଂ ବିକ୍ରେତାଙ୍କୁ ଆପଣ ଅନୁମତି ଦେବେ ତାହା ବାଛନ୍ତୁ। ଆପଣ ଯେକୌଣସି ସମୟରେ ନିଜ ପସନ୍ଦ ବଦଳାଇ ପାରିବେ।",
    purposesHeading: "ଉଦ୍ଦେଶ୍ୟ",
    vendorsHeading: "ବିକ୍ରେତା",
    requiredLabel: "ଆବଶ୍ୟକ",
  },
  as: {
    title: "আপোনাৰ গোপনীয়তা আমাৰ বাবে গুৰুত্বপূৰ্ণ",
    description:
      "আমি আপোনাৰ ব্ৰাউজিং অভিজ্ঞতা উন্নত কৰিবলৈ, ব্যক্তিগত বিষয়বস্তু দেখুৱাবলৈ আৰু ট্ৰেফিক বিশ্লেষণ কৰিবলৈ কুকি আৰু একে ধৰণৰ প্ৰযুক্তি ব্যৱহাৰ কৰোঁ। \"সকলো গ্ৰহণ কৰক\" ক্লিক কৰি আপুনি কুকি ব্যৱহাৰৰ সন্মতি দিয়ে।",
    acceptAllLabel: "সকলো গ্ৰহণ কৰক",
    rejectAllLabel: "সকলো প্ৰত্যাখ্যান কৰক",
    customizeLabel: "কাষ্টমাইজ কৰক",
    savePreferencesLabel: "পছন্দ সংৰক্ষণ কৰক",
    privacyPolicyText: "গোপনীয়তা নীতি",
    closeLabel: "বন্ধ কৰক",
    preferenceCenterTitle: "আপোনাৰ পছন্দ পৰিচালনা কৰক",
    preferenceCenterDescription:
      "কোনবোৰ উদ্দেশ্য আৰু বিক্ৰেতাক আপুনি অনুমতি দিব তাক বাছনি কৰক। আপুনি যিকোনো সময়তে আপোনাৰ পছন্দ সলনি কৰিব পাৰে।",
    purposesHeading: "উদ্দেশ্য",
    vendorsHeading: "বিক্ৰেতা",
    requiredLabel: "প্ৰয়োজনীয়",
  },
  ur: {
    title: "آپ کی رازداری ہمارے لیے اہم ہے",
    description:
      "ہم آپ کے براؤزنگ تجربے کو بہتر بنانے، ذاتی مواد دکھانے اور ٹریفک کا تجزیہ کرنے کے لیے کوکیز اور ملتی جلتی ٹیکنالوجیز استعمال کرتے ہیں۔ \"سب قبول کریں\" پر کلک کر کے آپ کوکیز کے استعمال کی رضامندی دیتے ہیں۔",
    acceptAllLabel: "سب قبول کریں",
    rejectAllLabel: "سب مسترد کریں",
    customizeLabel: "حسب ضرورت بنائیں",
    savePreferencesLabel: "ترجیحات محفوظ کریں",
    privacyPolicyText: "رازداری کی پالیسی",
    closeLabel: "بند کریں",
    preferenceCenterTitle: "اپنی ترجیحات منظم کریں",
    preferenceCenterDescription:
      "منتخب کریں کہ آپ کن مقاصد اور فروخت کنندگان کو اجازت دیتے ہیں۔ آپ اپنی پسند کسی بھی وقت بدل سکتے ہیں۔",
    purposesHeading: "مقاصد",
    vendorsHeading: "فروخت کنندگان",
    requiredLabel: "ضروری",
  },
  ne: {
    title: "तपाईंको गोपनीयता हामीलाई महत्त्वपूर्ण छ",
    description:
      "हामी तपाईंको ब्राउजिङ अनुभव सुधार्न, व्यक्तिगत सामग्री देखाउन र ट्राफिक विश्लेषण गर्न कुकीज र समान प्रविधि प्रयोग गर्छौं। \"सबै स्वीकार गर्नुहोस्\" क्लिक गरेर तपाईं कुकी प्रयोगमा सहमति दिनुहुन्छ।",
    acceptAllLabel: "सबै स्वीकार गर्नुहोस्",
    rejectAllLabel: "सबै अस्वीकार गर्नुहोस्",
    customizeLabel: "अनुकूलन गर्नुहोस्",
    savePreferencesLabel: "प्राथमिकताहरू बचत गर्नुहोस्",
    privacyPolicyText: "गोपनीयता नीति",
    closeLabel: "बन्द गर्नुहोस्",
    preferenceCenterTitle: "आफ्ना प्राथमिकताहरू व्यवस्थापन गर्नुहोस्",
    preferenceCenterDescription:
      "कुन उद्देश्य र बिक्रेताहरूलाई तपाईं अनुमति दिनुहुन्छ चयन गर्नुहोस्। तपाईं आफ्ना छनोटहरू जुनसुकै बेला परिवर्तन गर्न सक्नुहुन्छ।",
    purposesHeading: "उद्देश्यहरू",
    vendorsHeading: "बिक्रेताहरू",
    requiredLabel: "आवश्यक",
  },
  sa: {
    title: "भवतः गोपनीयता अस्माकं कृते महत्त्वपूर्णा",
    description:
      "भवतः जालदर्शनानुभवम् उद्यन्तुं, वैयक्तिकं विषयं दर्शयितुं, सञ्चारस्य विश्लेषणं कर्तुं च वयं कुकी-सदृशं तन्त्रं प्रयुञ्ज्महे। \"सर्वं स्वीकुरुत\" इति नुदनेन कुकी-प्रयोगाय भवतः सम्मतिः भवति।",
    acceptAllLabel: "सर्वं स्वीकुरुत",
    rejectAllLabel: "सर्वं निराकुरुत",
    customizeLabel: "यथारुचि रचयत",
    savePreferencesLabel: "प्राधान्यानि रक्षत",
    privacyPolicyText: "गोपनीयतानीतिः",
    closeLabel: "पिदधातु",
    preferenceCenterTitle: "स्वप्राधान्यानि प्रबन्धयत",
    preferenceCenterDescription:
      "केषां प्रयोजनानां विक्रेतॄणां च अनुमतिं ददाति इति चिनुत। भवतः चयनं कदापि परिवर्तयितुं शक्नोति।",
    purposesHeading: "प्रयोजनानि",
    vendorsHeading: "विक्रेतारः",
    requiredLabel: "आवश्यकम्",
  },
  kok: {
    title: "तुमची गुप्तता आमकां म्हत्वाची",
    description:
      "तुमची ब्राउझिंग अनुभूती सुधारपाक, वैयक्तिक आशय दाखोवपाक आनी ट्रॅफिक विश्लेषण करपाक आमी कुकीज आनी तशेच तंत्रज्ञान वापरतात. \"सगळें स्वीकारात\" क्लीक करून तुमी कुकीज वापराक संमती दितात.",
    acceptAllLabel: "सगळें स्वीकारात",
    rejectAllLabel: "सगळें नाकारात",
    customizeLabel: "अनुकूल करात",
    savePreferencesLabel: "प्राधान्यां सांबाळात",
    privacyPolicyText: "गुप्तता धोरण",
    closeLabel: "बंद करात",
    preferenceCenterTitle: "तुमचीं प्राधान्यां व्यवस्थापित करात",
    preferenceCenterDescription:
      "खंयच्या हेतूं आनी विक्रेत्यांक तुमी परवानगी दितात तें निवडात. तुमी तुमची निवड केन्नाय बदलूंक शकतात.",
    purposesHeading: "हेतू",
    vendorsHeading: "विक्रेते",
    requiredLabel: "गरजेचें",
  },
  mai: {
    title: "अहाँक गोपनीयता हमरा लेल महत्वपूर्ण अछि",
    description:
      "अहाँक ब्राउजिंग अनुभव नीक करबाक लेल, व्यक्तिगत सामग्री देखाबय आ ट्रैफिक विश्लेषण करबाक लेल हम कुकी आ समान तकनीकक उपयोग करैत छी। \"सभ स्वीकार करू\" क्लिक कए अहाँ कुकी उपयोग लेल सहमति दैत छी।",
    acceptAllLabel: "सभ स्वीकार करू",
    rejectAllLabel: "सभ अस्वीकार करू",
    customizeLabel: "अनुकूलित करू",
    savePreferencesLabel: "पसंद सुरक्षित करू",
    privacyPolicyText: "गोपनीयता नीति",
    closeLabel: "बन्न करू",
    preferenceCenterTitle: "अपन पसंद प्रबंधित करू",
    preferenceCenterDescription:
      "कओन उद्देश्य आ विक्रेता केँ अहाँ अनुमति दैत छी से चुनू। अहाँ कखनो अपन पसंद बदलि सकैत छी।",
    purposesHeading: "उद्देश्य",
    vendorsHeading: "विक्रेता",
    requiredLabel: "आवश्यक",
  },
  doi: {
    title: "तुंदी गोपनीयता साढ़े लेई मत्व वाली ऐ",
    description:
      "असी तुंदे ब्राउजिंग तजुर्बे गी बधाने, निजी सामग्री दखाने ते ट्रैफिक दा विश्लेषण करने लेई कुकीज ते इंजी तकनीक इस्तेमाल करदे आं। \"सब मंजूर करो\" क्लिक करियै तुस कुकीज दे इस्तेमाल दी सहमती दिंदे ओ।",
    acceptAllLabel: "सब मंजूर करो",
    rejectAllLabel: "सब नामंजूर करो",
    customizeLabel: "अनुकूलित करो",
    savePreferencesLabel: "पसंद बचाओ",
    privacyPolicyText: "गोपनीयता नीति",
    closeLabel: "बंद करो",
    preferenceCenterTitle: "अपनी पसंद प्रबंधित करो",
    preferenceCenterDescription:
      "किसें मकसद ते विक्रेतां गी तुस इजाजत दिंदे ओ सो चुनो। तुस अपनी पसंद कदें बी बदल सकदे ओ।",
    purposesHeading: "मकसद",
    vendorsHeading: "विक्रेता",
    requiredLabel: "जरूरी",
  },
  ks: {
    title: "تُہنٛز رازدٲری چھِ اَہم",
    description:
      "أَسۍ چھِ تُہنٛد براؤزنگ تجرُبہ بہتر بنان، ذاتی مواد ہاوان تہٕ ٹریفک جانچان کوکیز تہٕ یِتھے تکنیک استعمال کٔرِتھ۔ \"سٲری منظور کٔرِو\" کِلِک کٔرِتھ چھِ تُہۍ کوکی استعمالَس رضامندی دِوان.",
    acceptAllLabel: "سٲری منظور کٔرِو",
    rejectAllLabel: "سٲری رد کٔرِو",
    customizeLabel: "ترتیب دِیُن",
    savePreferencesLabel: "ترجیحات محفوٗظ کٔرِو",
    privacyPolicyText: "رازدٲری پالیسی",
    closeLabel: "بند کٔرِو",
    preferenceCenterTitle: "پننۍ ترجیحات منظم کٔرِو",
    preferenceCenterDescription:
      "ژارُن یِم مقصد تہٕ وینڈر تُہۍ اجازت دِیو۔ تُہۍ ہِکیو پننۍ پسند کانٛہہ تہِ وِز بدلٲوِتھ.",
    purposesHeading: "مقاصد",
    vendorsHeading: "وینڈر",
    requiredLabel: "ضروری",
  },
  sd: {
    title: "توهان جي رازداري اسان لاءِ اهم آهي",
    description:
      "اسان توهان جي برائوزنگ تجربي کي بهتر بڻائڻ، ذاتي مواد ڏيکارڻ ۽ ٽريفڪ جو تجزيو ڪرڻ لاءِ ڪوڪيز ۽ ساڳيون ٽيڪنالاجيون استعمال ڪريون ٿا. \"سڀ قبول ڪريو\" ڪلڪ ڪري توهان ڪوڪيز جي استعمال جي رضامندي ڏيو ٿا.",
    acceptAllLabel: "سڀ قبول ڪريو",
    rejectAllLabel: "سڀ رد ڪريو",
    customizeLabel: "ترتيب ڏيو",
    savePreferencesLabel: "ترجيحون محفوظ ڪريو",
    privacyPolicyText: "رازداريا پاليسي",
    closeLabel: "بند ڪريو",
    preferenceCenterTitle: "پنهنجون ترجيحون منظم ڪريو",
    preferenceCenterDescription:
      "چونڊيو ته توهان ڪهڙن مقصدن ۽ وڪڻڻ وارن کي اجازت ڏيو ٿا. توهان پنهنجي پسند ڪنهن به وقت بدلائي سگهو ٿا.",
    purposesHeading: "مقصد",
    vendorsHeading: "وڪڻڻ وارا",
    requiredLabel: "ضروري",
  },
  sat: {
    title: "ᱟᱢᱟᱜ ᱜᱚᱯᱚᱱᱤᱭᱚᱛᱟ ᱟᱞᱮ ᱞᱟᱹᱜᱤᱫ ᱢᱚᱦᱚᱛ",
    description:
      "ᱟᱞᱮ ᱟᱢᱟᱜ ᱵᱽᱨᱟᱣᱩᱡᱤᱝ ᱵᱟᱛᱟᱣ ᱵᱮᱥ ᱞᱟᱹᱜᱤᱫ, ᱱᱤᱡᱮᱨᱟᱜ ᱡᱤᱱᱤᱥ ᱫᱮᱠᱷᱟᱣ ᱞᱟᱹᱜᱤᱫ ᱟᱨ ᱴᱨᱟᱯᱷᱤᱠ ᱵᱤᱥᱞᱮᱥᱚᱱ ᱞᱟᱹᱜᱤᱫ ᱠᱩᱠᱤ ᱵᱮᱵᱷᱟᱨ ᱠᱟᱜ-ᱟ᱾ \"ᱡᱷᱚᱛᱚ ᱵᱟᱛᱟᱣ\" ᱚᱛᱟ ᱞᱮᱠᱷᱟᱱ ᱟᱢ ᱠᱩᱠᱤ ᱵᱮᱵᱷᱟᱨ ᱞᱟᱹᱜᱤᱫ ᱥᱤᱠᱟᱹᱨ ᱮᱢᱚᱜ-ᱟ᱾",
    acceptAllLabel: "ᱡᱷᱚᱛᱚ ᱵᱟᱛᱟᱣ",
    rejectAllLabel: "ᱡᱷᱚᱛᱚ ᱵᱟᱹᱨᱜᱤᱫ",
    customizeLabel: "ᱥᱟᱡᱟᱣ",
    savePreferencesLabel: "ᱠᱩᱥᱤ ᱥᱟᱺᱪᱟᱣ",
    privacyPolicyText: "ᱜᱚᱯᱚᱱᱤᱭᱚᱛᱟ ᱱᱤᱛᱤ",
    closeLabel: "ᱵᱚᱸᱫᱚ",
    preferenceCenterTitle: "ᱟᱢᱟᱜ ᱠᱩᱥᱤ ᱥᱟᱥᱚᱱ",
    preferenceCenterDescription:
      "ᱚᱠᱟ ᱠᱟᱹᱢᱤ ᱟᱨ ᱟᱹᱠᱷᱨᱤᱧᱤᱭᱟᱹ ᱠᱚ ᱟᱢ ᱮᱢᱚᱜ ᱠᱟᱜ-ᱟ ᱚᱱᱟ ᱵᱟᱪᱷᱟᱣ ᱢᱮ᱾ ᱟᱢ ᱡᱟᱦᱟᱸ ᱚᱠᱛᱚ ᱨᱮᱜᱮ ᱵᱚᱫᱚᱞ ᱫᱟᱲᱮᱭᱟᱜ-ᱟ᱾",
    purposesHeading: "ᱠᱟᱹᱢᱤ",
    vendorsHeading: "ᱟᱹᱠᱷᱨᱤᱧᱤᱭᱟᱹ",
    requiredLabel: "ᱞᱟᱹᱠᱛᱤ",
  },
  mni: {
    title: "নহাক্কী অরানবা অমদি গোপনীয়তা অইহল্লি",
    description:
      "নহাক্কী ব্রাউজিং খুদোংথিনবা ফগদবনি, মরুওইবা কনটেন্ট উৎপনি অমসুং ট্রেফিক শিংনবা কুকি অমসুং অসিমক্কী টেকনোলজি শিজিন্নৈ। \"লোইশিনবা যাউ\" ক্লিক তৌবদা নহাক্না কুকি শিজিন্নবগী অয়াবা পীরি।",
    acceptAllLabel: "লোইশিনবা যাউ",
    rejectAllLabel: "লোইশিনবা য়েংদবা",
    customizeLabel: "কস্টোমাইজ তৌ",
    savePreferencesLabel: "পমজবা সেভ তৌ",
    privacyPolicyText: "গোপনীয়তা পোলিসি",
    closeLabel: "খুমজিনৌ",
    preferenceCenterTitle: "নহাক্কী পমজবা শেমজিনৌ",
    preferenceCenterDescription:
      "করি মতমগী থবক অমসুং ভেন্ডরদা নহাক্না অয়াবা পীগে হায়বা খনবিয়ু। নহাক্না মতম খুদিংমক্কী ওইনা খনবদু হোংদোক্কদবনি।",
    purposesHeading: "থবক",
    vendorsHeading: "ভেন্ডর",
    requiredLabel: "মথৌ তাই",
  },
  brx: {
    title: "नोंथांनि गुप्तथाय आंनोंनि थाखाय गोनां",
    description:
      "नोंथांनि ब्राउजिं अनुभव मोजां खालामनो, निजि कन्टेन्ट दिहुननो आरो ट्राफिक बिजिरनो आंनों कुकी आरो एसेबां फारि बाहायनाय। \"गासै आजाब\" क्लिक खालामनायजों नोंथाङा कुकी बाहायनो सहमति होयो।",
    acceptAllLabel: "गासै आजाब",
    rejectAllLabel: "गासै नेवसि",
    customizeLabel: "गावनि सानस्रिबादि खालाम",
    savePreferencesLabel: "सानस्रि दोन",
    privacyPolicyText: "गुप्तथाय आखुथाय",
    closeLabel: "बन्द खालाम",
    preferenceCenterTitle: "नोंथांनि सानस्रि खामानि खालाम",
    preferenceCenterDescription:
      "माबा मोनथि आरो फानग्राखौ नोंथाङा गनायनाय से सायख। नोंथाङा माब्लाबाबो नोंथांनि सायखनाय सोलायनो हायो।",
    purposesHeading: "मोनथि",
    vendorsHeading: "फानग्रा",
    requiredLabel: "गोनां",
  },
};

export const INDIAN_UI_STRINGS: Record<string, BannerUiStrings> = {
  hi: {
    dataPrincipalRights: "डेटा प्रिंसिपल अधिकार",
    under18: "मैं 18 वर्ष से कम हूँ",
    ageConfirmStart: "नीचे स्वीकार या अस्वीकार चुनकर आप पुष्टि करते हैं कि आपकी आयु ",
    ageConfirmStrong: "18 वर्ष या अधिक",
    ageConfirmEnd: " है, DPDP अधिनियम धारा 9 के अनुसार। ",
    cookiePolicy: "कुकी नीति",
    language: "भाषा",
    parentalTitle: "अभिभावक की सहमति आवश्यक है",
    parentalBody:
      "DPDP अधिनियम धारा 9 के अनुसार, 18 वर्ष से कम आयु वालों का व्यक्तिगत डेटा संसाधित करने के लिए सत्यापित अभिभावक सहमति आवश्यक है। हमने डेटा संग्रह को केवल आवश्यक कुकीज़ तक सीमित कर दिया है।",
  },
  bn: {
    dataPrincipalRights: "ডেটা প্রিন্সিপাল অধিকার",
    under18: "আমার বয়স ১৮-এর কম",
    ageConfirmStart: "নিচে গ্রহণ বা প্রত্যাখ্যান বেছে আপনি নিশ্চিত করছেন যে আপনার বয়স ",
    ageConfirmStrong: "১৮ বছর বা তার বেশি",
    ageConfirmEnd: ", DPDP আইন ধারা ৯ অনুযায়ী। ",
    cookiePolicy: "কুকি নীতি",
    language: "ভাষা",
    parentalTitle: "অভিভাবকের সম্মতি প্রয়োজন",
    parentalBody:
      "DPDP আইন ধারা ৯ অনুযায়ী, ১৮ বছরের কম বয়সীদের ব্যক্তিগত তথ্য প্রক্রিয়াকরণে যাচাইযোগ্য অভিভাবক সম্মতি প্রয়োজন। আমরা কেবল প্রয়োজনীয় কুকিতে তথ্য সংগ্রহ সীমিত করেছি।",
  },
  ta: {
    dataPrincipalRights: "தரவு முதன்மை உரிமைகள்",
    under18: "எனக்கு 18 வயதுக்குக் குறைவு",
    ageConfirmStart: "கீழே ஏற்கவும் அல்லது நிராகரிக்கவும் என்பதைத் தேர்ந்தெடுப்பதன் மூலம் உங்கள் வயது ",
    ageConfirmStrong: "18 அல்லது அதற்கு மேல்",
    ageConfirmEnd: " என்பதை DPDP சட்டம் பிரிவு 9 இன் படி உறுதிப்படுத்துகிறீர்கள். ",
    cookiePolicy: "குக்கீ கொள்கை",
    language: "மொழி",
    parentalTitle: "பெற்றோர் ஒப்புதல் தேவை",
    parentalBody:
      "DPDP சட்டம் பிரிவு 9 இன் படி, 18 வயதுக்குட்பட்டோரின் தனிப்பட்ட தரவைச் செயலாக்க சரிபார்க்கப்பட்ட பெற்றோர்/பாதுகாவலர் ஒப்புதல் தேவை. இன்றியமையாத குக்கீகளுக்கு மட்டும் தரவு சேகரிப்பைக் கட்டுப்படுத்திவிட்டோம்.",
  },
  te: {
    dataPrincipalRights: "డేటా ప్రిన్సిపల్ హక్కులు",
    under18: "నాకు 18 ఏళ్లు కంటే తక్కువ",
    ageConfirmStart: "కింద అంగీకరించండి లేదా తిరస్కరించండి ఎంచుకోవడం ద్వారా మీ వయసు ",
    ageConfirmStrong: "18 ఏళ్లు లేదా అంతకంటే ఎక్కువ",
    ageConfirmEnd: " అని DPDP చట్టం సెక్షన్ 9 ప్రకారం మీరు ధృవీకరిస్తున్నారు. ",
    cookiePolicy: "కుకీ విధానం",
    language: "భాష",
    parentalTitle: "తల్లిదండ్రుల సమ్మతి అవసరం",
    parentalBody:
      "DPDP చట్టం సెక్షన్ 9 ప్రకారం, 18 ఏళ్లలోపు వారి వ్యక్తిగత డేటాను ప్రాసెస్ చేయడానికి ధృవీకరించదగిన తల్లిదండ్రుల/సంరక్షకుల సమ్మతి అవసరం. అవసరమైన కుకీలకు మాత్రమే డేటా సేకరణను పరిమితం చేశాము.",
  },
  mr: {
    dataPrincipalRights: "डेटा प्रिन्सिपल अधिकार",
    under18: "मी 18 वर्षांपेक्षा कमी आहे",
    ageConfirmStart: "खाली स्वीकार किंवा नाकार निवडून तुम्ही पुष्टी करता की तुमचे वय ",
    ageConfirmStrong: "18 वर्षे किंवा अधिक",
    ageConfirmEnd: " आहे, DPDP कायदा कलम 9 नुसार. ",
    cookiePolicy: "कुकी धोरण",
    language: "भाषा",
    parentalTitle: "पालकांची संमती आवश्यक",
    parentalBody:
      "DPDP कायदा कलम 9 नुसार, 18 वर्षांखालील व्यक्तींचा वैयक्तिक डेटा प्रक्रिया करण्यासाठी पडताळणीयोग्य पालक संमती आवश्यक आहे. आम्ही डेटा संकलन केवळ आवश्यक कुकीजपुरते मर्यादित केले आहे.",
  },
  gu: {
    dataPrincipalRights: "ડેટા પ્રિન્સિપલ અધિકારો",
    under18: "હું 18 વર્ષથી નાનો/નાની છું",
    ageConfirmStart: "નીચે સ્વીકારો અથવા નકારો પસંદ કરીને તમે પુષ્ટિ કરો છો કે તમારી ઉંમર ",
    ageConfirmStrong: "18 વર્ષ અથવા વધુ",
    ageConfirmEnd: " છે, DPDP અધિનિયમ કલમ 9 મુજબ. ",
    cookiePolicy: "કુકી નીતિ",
    language: "ભાષા",
    parentalTitle: "વાલીની સંમતિ જરૂરી",
    parentalBody:
      "DPDP અધિનિયમ કલમ 9 મુજબ, 18 વર્ષથી ઓછી ઉંમરના લોકોનો વ્યક્તિગત ડેટા પ્રક્રિયા કરવા ચકાસણીય વાલી સંમતિ જરૂરી છે. અમે ડેટા સંગ્રહ ફક્ત જરૂરી કુકીઝ સુધી મર્યાદિત કર્યો છે.",
  },
  kn: {
    dataPrincipalRights: "ಡೇಟಾ ಪ್ರಿನ್ಸಿಪಲ್ ಹಕ್ಕುಗಳು",
    under18: "ನನಗೆ 18 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ",
    ageConfirmStart: "ಕೆಳಗೆ ಸ್ವೀಕರಿಸಿ ಅಥವಾ ನಿರಾಕರಿಸಿ ಆಯ್ಕೆ ಮಾಡುವ ಮೂಲಕ ನಿಮ್ಮ ವಯಸ್ಸು ",
    ageConfirmStrong: "18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು",
    ageConfirmEnd: " ಎಂದು DPDP ಕಾಯಿದೆ ಸೆಕ್ಷನ್ 9 ರ ಪ್ರಕಾರ ನೀವು ದೃಢಪಡಿಸುತ್ತೀರಿ. ",
    cookiePolicy: "ಕುಕೀ ನೀತಿ",
    language: "ಭಾಷೆ",
    parentalTitle: "ಪೋಷಕರ ಒಪ್ಪಿಗೆ ಅಗತ್ಯ",
    parentalBody:
      "DPDP ಕಾಯಿದೆ ಸೆಕ್ಷನ್ 9 ರ ಪ್ರಕಾರ, 18 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ ವಯಸ್ಸಿನವರ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಸಂಸ್ಕರಿಸಲು ಪರಿಶೀಲಿಸಬಹುದಾದ ಪೋಷಕ/ಪಾಲಕರ ಒಪ್ಪಿಗೆ ಅಗತ್ಯ. ಅಗತ್ಯ ಕುಕೀಗಳಿಗೆ ಮಾತ್ರ ಡೇಟಾ ಸಂಗ್ರಹವನ್ನು ನಾವು ಮಿತಿಗೊಳಿಸಿದ್ದೇವೆ.",
  },
  ml: {
    dataPrincipalRights: "ഡാറ്റ പ്രിൻസിപ്പൽ അവകാശങ്ങൾ",
    under18: "എനിക്ക് 18 വയസ്സിന് താഴെ",
    ageConfirmStart: "താഴെ അംഗീകരിക്കുക അല്ലെങ്കിൽ നിരസിക്കുക തിരഞ്ഞെടുക്കുന്നതിലൂടെ നിങ്ങളുടെ പ്രായം ",
    ageConfirmStrong: "18 വയസ്സോ അതിലധികമോ",
    ageConfirmEnd: " ആണെന്ന് DPDP നിയമം സെക്ഷൻ 9 പ്രകാരം നിങ്ങൾ സ്ഥിരീകരിക്കുന്നു. ",
    cookiePolicy: "കുക്കി നയം",
    language: "ഭാഷ",
    parentalTitle: "രക്ഷിതാവിന്റെ സമ്മതം ആവശ്യമാണ്",
    parentalBody:
      "DPDP നിയമം സെക്ഷൻ 9 പ്രകാരം, 18 വയസ്സിന് താഴെയുള്ളവരുടെ വ്യക്തിഗത ഡാറ്റ പ്രോസസ് ചെയ്യാൻ പരിശോധിക്കാവുന്ന രക്ഷിതൃ സമ്മതം ആവശ്യമാണ്. അത്യാവശ്യ കുക്കികളിലേക്ക് മാത്രം ഡാറ്റ ശേഖരണം ഞങ്ങൾ പരിമിതപ്പെടുത്തിയിരിക്കുന്നു.",
  },
  pa: {
    dataPrincipalRights: "ਡਾਟਾ ਪ੍ਰਿੰਸੀਪਲ ਅਧਿਕਾਰ",
    under18: "ਮੈਂ 18 ਤੋਂ ਘੱਟ ਉਮਰ ਦਾ/ਦੀ ਹਾਂ",
    ageConfirmStart: "ਹੇਠਾਂ ਸਵੀਕਾਰ ਜਾਂ ਅਸਵੀਕਾਰ ਚੁਣ ਕੇ ਤੁਸੀਂ ਪੁਸ਼ਟੀ ਕਰਦੇ ਹੋ ਕਿ ਤੁਹਾਡੀ ਉਮਰ ",
    ageConfirmStrong: "18 ਸਾਲ ਜਾਂ ਵੱਧ",
    ageConfirmEnd: " ਹੈ, DPDP ਐਕਟ ਧਾਰਾ 9 ਅਨੁਸਾਰ। ",
    cookiePolicy: "ਕੂਕੀ ਨੀਤੀ",
    language: "ਭਾਸ਼ਾ",
    parentalTitle: "ਮਾਪਿਆਂ ਦੀ ਸਹਿਮਤੀ ਲੋੜੀਂਦੀ ਹੈ",
    parentalBody:
      "DPDP ਐਕਟ ਧਾਰਾ 9 ਅਨੁਸਾਰ, 18 ਤੋਂ ਘੱਟ ਉਮਰ ਵਾਲਿਆਂ ਦਾ ਨਿੱਜੀ ਡਾਟਾ ਪ੍ਰੋਸੈਸ ਕਰਨ ਲਈ ਤਸਦੀਕਯੋਗ ਮਾਪਿਆਂ/ਸਰਪ੍ਰਸਤ ਦੀ ਸਹਿਮਤੀ ਲੋੜੀਂਦੀ ਹੈ। ਅਸੀਂ ਡਾਟਾ ਇਕੱਠਾ ਕਰਨ ਨੂੰ ਸਿਰਫ਼ ਲੋੜੀਂਦੀਆਂ ਕੂਕੀਜ਼ ਤੱਕ ਸੀਮਿਤ ਕੀਤਾ ਹੈ।",
  },
  or: {
    dataPrincipalRights: "ଡାଟା ପ୍ରିନ୍ସିପାଲ୍ ଅଧିକାର",
    under18: "ମୋର ବୟସ 18ରୁ କମ୍",
    ageConfirmStart: "ତଳେ ଗ୍ରହଣ କିମ୍ବା ପ୍ରତ୍ୟାଖ୍ୟାନ ବାଛି ଆପଣ ନିଶ୍ଚିତ କରୁଛନ୍ତି ଯେ ଆପଣଙ୍କ ବୟସ ",
    ageConfirmStrong: "18 ବର୍ଷ କିମ୍ବା ଅଧିକ",
    ageConfirmEnd: ", DPDP ଅଧିନିୟମ ଧାରା 9 ଅନୁଯାୟୀ। ",
    cookiePolicy: "କୁକି ନୀତି",
    language: "ଭାଷା",
    parentalTitle: "ଅଭିଭାବକଙ୍କ ସମ୍ମତି ଆବଶ୍ୟକ",
    parentalBody:
      "DPDP ଅଧିନିୟମ ଧାରା 9 ଅନୁଯାୟୀ, 18 ବର୍ଷରୁ କମ୍ ବ୍ୟକ୍ତିଙ୍କ ବ୍ୟକ୍ତିଗତ ତଥ୍ୟ ପ୍ରକ୍ରିୟାକରଣ ପାଇଁ ଯାଞ୍ଚଯୋଗ୍ୟ ଅଭିଭାବକ ସମ୍ମତି ଆବଶ୍ୟକ। ଆମେ କେବଳ ଆବଶ୍ୟକ କୁକିରେ ତଥ୍ୟ ସଂଗ୍ରହ ସୀମିତ କରିଛୁ।",
  },
  as: {
    dataPrincipalRights: "ডেটা প্ৰিন্সিপাল অধিকাৰ",
    under18: "মোৰ বয়স ১৮ৰ কম",
    ageConfirmStart: "তলত গ্ৰহণ বা প্ৰত্যাখ্যান বাছি আপুনি নিশ্চিত কৰে যে আপোনাৰ বয়স ",
    ageConfirmStrong: "১৮ বছৰ বা তাতকৈ অধিক",
    ageConfirmEnd: ", DPDP আইন ধাৰা ৯ অনুসৰি। ",
    cookiePolicy: "কুকি নীতি",
    language: "ভাষা",
    parentalTitle: "অভিভাৱকৰ সন্মতিৰ প্ৰয়োজন",
    parentalBody:
      "DPDP আইন ধাৰা ৯ অনুসৰি, ১৮ বছৰৰ কম বয়সীয়াসকলৰ ব্যক্তিগত তথ্য প্ৰক্ৰিয়াকৰণত সত্যাপনযোগ্য অভিভাৱক সন্মতিৰ প্ৰয়োজন। আমি কেৱল প্ৰয়োজনীয় কুকিলৈ তথ্য সংগ্ৰহ সীমিত কৰিছো।",
  },
  ur: {
    dataPrincipalRights: "ڈیٹا پرنسپل حقوق",
    under18: "میری عمر 18 سے کم ہے",
    ageConfirmStart: "نیچے قبول یا مسترد منتخب کر کے آپ تصدیق کرتے ہیں کہ آپ کی عمر ",
    ageConfirmStrong: "18 سال یا زیادہ",
    ageConfirmEnd: " ہے، DPDP ایکٹ دفعہ 9 کے مطابق۔ ",
    cookiePolicy: "کوکی پالیسی",
    language: "زبان",
    parentalTitle: "والدین کی رضامندی درکار ہے",
    parentalBody:
      "DPDP ایکٹ دفعہ 9 کے مطابق، 18 سال سے کم عمر افراد کا ذاتی ڈیٹا پروسیس کرنے کے لیے قابل تصدیق والدین/سرپرست کی رضامندی درکار ہے۔ ہم نے ڈیٹا جمع کرنے کو صرف ضروری کوکیز تک محدود کر دیا ہے۔",
  },
  ne: {
    dataPrincipalRights: "डेटा प्रिन्सिपल अधिकार",
    under18: "मेरो उमेर १८ वर्षभन्दा कम छ",
    ageConfirmStart: "तल स्वीकार वा अस्वीकार छानेर तपाईं पुष्टि गर्नुहुन्छ कि तपाईंको उमेर ",
    ageConfirmStrong: "१८ वर्ष वा बढी",
    ageConfirmEnd: " छ, DPDP ऐन दफा ९ अनुसार। ",
    cookiePolicy: "कुकी नीति",
    language: "भाषा",
    parentalTitle: "अभिभावकको सहमति आवश्यक",
    parentalBody:
      "DPDP ऐन दफा ९ अनुसार, १८ वर्षमुनिका व्यक्तिको व्यक्तिगत डेटा प्रशोधन गर्न प्रमाणित अभिभावक सहमति आवश्यक छ। हामीले डेटा संकलन आवश्यक कुकीजमा मात्र सीमित गरेका छौं।",
  },
  sa: {
    dataPrincipalRights: "दत्तांश-प्रधानस्य अधिकाराः",
    under18: "मम आयुः १८ वर्षेभ्यः न्यूनम्",
    ageConfirmStart: "अधः स्वीकृतिं वा निराकरणं चित्वा भवान् द्रढयति यत् तस्य आयुः ",
    ageConfirmStrong: "१८ वर्षाणि वा अधिकम्",
    ageConfirmEnd: " अस्ति, DPDP अधिनियमस्य धारा ९ अनुसारम्। ",
    cookiePolicy: "कुकी-नीतिः",
    language: "भाषा",
    parentalTitle: "पितृसम्मतिः आवश्यकी",
    parentalBody:
      "DPDP अधिनियमस्य धारा ९ अनुसारम्, १८ वर्षेभ्यः न्यूनानां वैयक्तिकदत्तांशस्य संस्करणाय सत्यापिता पितृ/संरक्षक-सम्मतिः आवश्यकी। वयं आवश्यककुकीषु एव दत्तांशसङ्ग्रहं सीमितवन्तः।",
  },
  kok: {
    dataPrincipalRights: "डेटा प्रिन्सिपल हक्क",
    under18: "म्हजी पीर 18 वरां परस कमी",
    ageConfirmStart: "सकयल स्वीकारात वा नाकारात निवडून तुमी पुष्टी करतात की तुमची पीर ",
    ageConfirmStrong: "18 वर्स वा चड",
    ageConfirmEnd: " आसा, DPDP कायदो कलम 9 प्रमाणें। ",
    cookiePolicy: "कुकी धोरण",
    language: "भास",
    parentalTitle: "पालकांची संमती गरजेची",
    parentalBody:
      "DPDP कायदो कलम 9 प्रमाणें, 18 वरां परस कमी पीरेच्या व्यक्तींचो वैयक्तिक डेटा प्रक्रिया करपाक तपासणी करूंक मेळपी पालक संमती गरजेची. आमी डेटा एकठांय करप फकत गरजेच्या कुकीज मेरेन मर्यादित केलां.",
  },
  mai: {
    dataPrincipalRights: "डेटा प्रिंसिपल अधिकार",
    under18: "हम 18 सँ कम छी",
    ageConfirmStart: "नीचाँ स्वीकार वा अस्वीकार चुनिकय अहाँ पुष्टि करैत छी जे अहाँक आयु ",
    ageConfirmStrong: "18 वर्ष वा बेसी",
    ageConfirmEnd: " अछि, DPDP अधिनियम धारा 9 अनुसार। ",
    cookiePolicy: "कुकी नीति",
    language: "भाषा",
    parentalTitle: "अभिभावकक सहमति आवश्यक",
    parentalBody:
      "DPDP अधिनियम धारा 9 अनुसार, 18 सँ कम आयु वालामें व्यक्तिगत डेटा प्रक्रिया करबाक लेल सत्यापित अभिभावक सहमति आवश्यक अछि। हम आवश्यक कुकी धरि डेटा संग्रह सीमित कएने छी।",
  },
  doi: {
    dataPrincipalRights: "डेटा प्रिंसिपल अधिकार",
    under18: "मेरी उम्र 18 तोहें घट्ट ऐ",
    ageConfirmStart: "थल्ले मंजूर जां नामंजूर चुनियै तुस पुष्टी करदे ओ जे तुंदी उम्र ",
    ageConfirmStrong: "18 साल जां मते",
    ageConfirmEnd: " ऐ, DPDP एक्ट धारा 9 दे मुताबक। ",
    cookiePolicy: "कुकी नीति",
    language: "भाशा",
    parentalTitle: "माता-पिता दी सहमती लोड़दी",
    parentalBody:
      "DPDP एक्ट धारा 9 दे मुताबक, 18 तोहें घट्ट उम्र दे लोकें दा निजी डेटा प्रोसेस करने लेई तस्दीकयोग माता-पिता/सरपरस्त दी सहमती लोड़दी ऐ। असी डेटा इकट्ठा करने गी सिर्फ जरूरी कुकीज तिकर सीमित कीता ऐ।",
  },
  ks: {
    dataPrincipalRights: "ڈیٹا پرنسپل حقوٗق",
    under18: "مےٚ چھُس 18 کھۄتہٕ کم",
    ageConfirmStart: "بۆن قبول یا رد ژارنہٕ سۭتۍ چھِو تُہۍ تصدیٖق کران زِ تُہنٛز وٲنٛس چھِ ",
    ageConfirmStrong: "18 وٕری یا زیادٕ",
    ageConfirmEnd: "، DPDP ایکٹ دفعہ 9 مُطٲبِق۔ ",
    cookiePolicy: "کوکی پالیسی",
    language: "زبان",
    parentalTitle: "مول موج ہٕنٛز رضامندی ضروٗری",
    parentalBody:
      "DPDP ایکٹ دفعہ 9 مُطٲبِق، 18 کھۄتہٕ کم وٲنٛس والین ہُنٛد ذاتی ڈیٹا پروسیس کرنہٕ باپتھ چھِ تصدیٖق شدٕ مول موج/سرپرست ہٕنٛز رضامندی ضروٗری۔ أسۍ چھِ ڈیٹا جمع کرُن صرف ضروٗری کوکیز تام محدود کورمُت.",
  },
  sd: {
    dataPrincipalRights: "ڊيٽا پرنسپل حق",
    under18: "مان 18 کان گهٽ آهيان",
    ageConfirmStart: "هيٺ قبول يا رد چونڊي توهان تصديق ڪريو ٿا ته توهان جي عمر ",
    ageConfirmStrong: "18 سال يا وڌيڪ",
    ageConfirmEnd: " آهي، DPDP ايڪٽ دفعو 9 مطابق. ",
    cookiePolicy: "ڪوڪي پاليسي",
    language: "ٻولي",
    parentalTitle: "والدين جي رضامندي گهرجي",
    parentalBody:
      "DPDP ايڪٽ دفعو 9 مطابق، 18 سالن کان گهٽ عمر وارن جو ذاتي ڊيٽا پروسيس ڪرڻ لاءِ تصديق لائق والدين/سرپرست جي رضامندي گهرجي. اسان ڊيٽا گڏ ڪرڻ کي صرف ضروري ڪوڪيز تائين محدود ڪيو آهي.",
  },
  sat: {
    dataPrincipalRights: "ᱰᱮᱴᱟ ᱯᱨᱤᱱᱥᱤᱯᱟᱞ ᱟᱹᱭᱫᱟᱹᱨᱤ",
    under18: "ᱤᱧ ᱨᱮᱱᱟᱜ ᱩᱢᱮᱨ 18 ᱠᱷᱚᱱ ᱠᱚᱢ",
    ageConfirmStart: "ᱞᱟᱛᱟᱨ ᱨᱮ ᱵᱟᱛᱟᱣ ᱟᱨᱵᱟᱝ ᱵᱟᱹᱨᱜᱤᱫ ᱵᱟᱪᱷᱟᱣ ᱠᱟᱛᱮ ᱟᱢ ᱯᱩᱥᱴᱟᱹᱣ ᱮᱫ-ᱟ ᱡᱮ ᱟᱢᱟᱜ ᱩᱢᱮᱨ ",
    ageConfirmStrong: "18 ᱥᱮᱨᱢᱟ ᱟᱨᱵᱟᱝ ᱰᱷᱮᱨ",
    ageConfirmEnd: " ᱠᱟᱱᱟ, DPDP ᱟᱹᱭᱩᱨ ᱦᱟᱹᱴᱤᱧ 9 ᱞᱮᱠᱟᱛᱮ᱾ ",
    cookiePolicy: "ᱠᱩᱠᱤ ᱱᱤᱛᱤ",
    language: "ᱯᱟᱹᱨᱥᱤ",
    parentalTitle: "ᱟᱡᱽᱜᱟᱛ ᱨᱮᱱᱟᱜ ᱥᱤᱠᱟᱹᱨ ᱞᱟᱹᱠᱛᱤ",
    parentalBody:
      "DPDP ᱟᱹᱭᱩᱨ ᱦᱟᱹᱴᱤᱧ 9 ᱞᱮᱠᱟᱛᱮ, 18 ᱠᱷᱚᱱ ᱠᱚᱢ ᱩᱢᱮᱨ ᱦᱚᱲ ᱨᱮᱱᱟᱜ ᱱᱤᱡᱮᱨᱟᱜ ᱰᱮᱴᱟ ᱠᱟᱹᱢᱤ ᱞᱟᱹᱜᱤᱫ ᱧᱮᱞ ᱜᱟᱱᱚᱜ ᱟᱡᱽᱜᱟᱛ ᱥᱤᱠᱟᱹᱨ ᱞᱟᱹᱠᱛᱤ᱾ ᱟᱞᱮ ᱰᱮᱴᱟ ᱡᱟᱣᱨᱟ ᱫᱚ ᱠᱷᱟᱹᱞᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱ ᱠᱩᱠᱤ ᱦᱟᱹᱵᱤᱡ ᱜᱮ ᱮᱥᱮᱫ ᱟᱠᱟᱫ-ᱟ᱾",
  },
  mni: {
    dataPrincipalRights: "ডেটা প্রিন্সিপল খুদোংচাবা",
    under18: "ঐগী মতম 18 দগী হেন্না নত্তে",
    ageConfirmStart: "মখাদা যাউ নত্ত্রগা য়েংদবা খনবদগী নহাক্না খঙহনৈ নহাক্কী মতম ",
    ageConfirmStrong: "18 চহি নত্ত্রগা হেন্না",
    ageConfirmEnd: " নি হায়বা DPDP অ্যাক্ট সেকশন 9 গী মতুংইন্না। ",
    cookiePolicy: "কুকি পোলিসি",
    language: "লোল",
    parentalTitle: "মমা-মপাগী অয়াবা তাই",
    parentalBody:
      "DPDP অ্যাক্ট সেকশন 9 গী মতুংইন্না, 18 চহিগী মখাদা লৈবা মীওইগী অরানবা ডেটা প্রসেস তৌনবা য়েংবা ঙম্বা মমা-মপা/গার্দিয়ানগী অয়াবা তাই। অহল্লবা কুকিদা ফাওবা ডেটা খোমজিনবদু ঐখোয়না শেংদোক্লে।",
  },
  brx: {
    dataPrincipalRights: "डाटा प्रिन्सिपल अधिकार",
    under18: "आं 18 बोसोरनि खालाम",
    ageConfirmStart: "गाहायआव आजाब एबा नेवसि सायखनायजों नोंथाङा थि खालामो नोंथांनि बय ",
    ageConfirmStrong: "18 बोसोर एबा बांसिन",
    ageConfirmEnd: " जायो, DPDP आइन धारा 9 बादि। ",
    cookiePolicy: "कुकी आखुथाय",
    language: "राव",
    parentalTitle: "बिमा-बिफा सहमति गोनां",
    parentalBody:
      "DPDP आइन धारा 9 बादि, 18 बोसोरनि खालाम सुबुंनि निजि डाटा प्रसेस खालामनो थि खालामनाय बिमा-बिफा/ Palak सहमति गोनां। आंनों डाटा जथायनायखौ गोनां कुकीसिम सिमा खालामबाय।",
  },
};

function localeKey(locale: string): string {
  const normalized = normalizeLocaleTag(locale) ?? locale;
  const base = languageOf(normalized);
  return LOCALE_ALIASES[base] ?? base;
}

export function builtinNoticeForLocale(locale: string): NoticeStrings | undefined {
  return INDIAN_NOTICE_PACKS[localeKey(locale)];
}

export function builtinUiStringsForLocale(locale: string): BannerUiStrings {
  return INDIAN_UI_STRINGS[localeKey(locale)] ?? DEFAULT_BANNER_UI_STRINGS;
}

export function nativeLocaleLabel(code: string): string {
  const key = localeKey(code);
  return INDIAN_LOCALE_NATIVE_LABELS[code] ?? INDIAN_LOCALE_NATIVE_LABELS[key] ?? code;
}
