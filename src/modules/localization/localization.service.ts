const supportedLanguages = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "mk", label: "Macedonian", nativeName: "Македонски" },
  { code: "sr", label: "Serbian", nativeName: "Српски" },
  { code: "tr", label: "Turkish", nativeName: "Türkçe" },
  { code: "sq", label: "Albanian", nativeName: "Shqip" },
  { code: "bg", label: "Bulgarian", nativeName: "Български" },
  { code: "hr", label: "Croatian", nativeName: "Hrvatski" },
  { code: "ro", label: "Romanian", nativeName: "Română" },
  { code: "bs", label: "Bosnian", nativeName: "Bosanski" },
];

export class LocalizationService {
  listLanguages() {
    return supportedLanguages;
  }
}
