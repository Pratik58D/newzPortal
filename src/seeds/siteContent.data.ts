// Initial content for docs/dynamic-frontend-plan.md, Phase 0.
//
// This reproduces what the public site renders today so switching it to
// backend-driven content (Phases 2–4) changes nothing visually on day one.
// Sources: components/site/layout/{Footer,HeaderNavigation}.tsx, app/layout.tsx
// metadata, and app/(site)/page.tsx in newsportal_frontend.
//
// English strings are drafts (the current site is Nepali-only); the official
// English name "Pratidhwani" is taken from the project docs.

import type { HomepageSectionType } from "../models/homepageSection.model.js";

interface Localized {
  np: string;
  en: string;
}

export interface SiteSettingsSeed {
  siteName: Localized;
  tagline: Localized;
  about: Localized;
  contact: { email: string; phone: string; address: Localized };
  social: {
    facebook: string;
    twitter: string;
    youtube: string;
    instagram: string;
  };
  seo: { title: Localized; description: Localized };
  footerLinks: {
    title: Localized;
    links: { label: Localized; pageSlug: string }[];
  }[];
  copyright: Localized;
  footerNote: Localized;
}

export interface HomepageSectionSeed {
  key: string;
  type: HomepageSectionType;
  enabled: boolean;
  order: number;
  title: Localized;
  config: { categorySlug?: string; limit?: number; placement?: string };
}

export interface PageSeed {
  slug: string;
  title: Localized;
  body: Localized;
  isPublished: boolean;
  showInFooter: boolean;
}

const NO_TITLE: Localized = { np: "", en: "" };

// ─── Site settings ───────────────────────────────────────────────────────────

export const siteSettingsSeed: SiteSettingsSeed = {
  siteName: { np: "प्रतिध्वनि", en: "Pratidhwani" },
  tagline: { np: "भरपर्दो नेपाली समाचार", en: "Reliable Nepali News" },
  about: {
    np: "नेपालको भरपर्दो, स्वतन्त्र र समयमै समाचार दिने डिजिटल पत्रिका। सत्य, तथ्य र जनताको आवाज।",
    en: "Nepal's reliable, independent digital newspaper, delivering the news on time. Truth, facts and the voice of the people.",
  },

  // The current footer has no contact details, and its three social links are
  // `href="#"` placeholders — nothing real to preserve. Left empty on purpose
  // rather than inventing values; fill these in via the admin UI (Phase 2).
  contact: { email: "", phone: "", address: { np: "", en: "" } },
  social: { facebook: "", twitter: "", youtube: "", instagram: "" },

  seo: {
    title: {
      np: "प्रतिध्वनि — नेपालको भरपर्दो समाचार",
      en: "Pratidhwani — Nepal's Reliable News",
    },
    description: {
      np: "प्रतिध्वनि नेपालको भरपर्दो डिजिटल समाचार पोर्टल हो। राजनीति, अर्थतन्त्र, खेलकुद, प्रविधि, मनोरञ्जन तथा सातै प्रदेशका ताजा समाचार।",
      en: "Pratidhwani is Nepal's reliable digital news portal: the latest news on politics, business, sports, technology and entertainment, and from all seven provinces.",
    },
  },

  // Only the fourth footer column ("प्रतिध्वनि") is seeded. The category and
  // province columns are hand-typed lists today that Phase 2 derives from the
  // categories/provinces APIs, so they are deliberately not stored here.
  footerLinks: [
    {
      title: { np: "प्रतिध्वनि", en: "Pratidhwani" },
      links: [
        { label: { np: "हाम्रो बारे", en: "About Us" }, pageSlug: "about" },
        { label: { np: "सम्पर्क", en: "Contact" }, pageSlug: "contact" },
        {
          label: { np: "गोपनीयता नीति", en: "Privacy Policy" },
          pageSlug: "privacy",
        },
        { label: { np: "सर्तहरू", en: "Terms" }, pageSlug: "terms" },
        {
          label: { np: "विज्ञापन दिनुहोस्", en: "Advertise With Us" },
          pageSlug: "advertise",
        },
      ],
    },
  ],

  // Composed at render time as "© {year} {siteName}. {copyright}".
  copyright: { np: "सर्वाधिकार सुरक्षित।", en: "All rights reserved." },
  footerNote: {
    np: "बागमती, नेपालबाट सञ्चालित",
    en: "Operated from Bagmati, Nepal",
  },
};

// ─── Homepage sections (order matches app/(site)/page.tsx today) ─────────────
// Orders step by 10 so a section can later be inserted between two others.

export const homepageSectionsSeed: HomepageSectionSeed[] = [
  {
    key: "hero",
    type: "hero",
    enabled: true,
    order: 10,
    title: NO_TITLE,
    config: {},
  },
  {
    key: "home-banner-ad",
    type: "banner-ad",
    enabled: true,
    order: 20,
    title: NO_TITLE,
    config: { placement: "home_banner" },
  },
  {
    key: "latest",
    type: "latest",
    enabled: true,
    order: 30,
    title: { np: "ताजा समाचार", en: "Latest News" },
    config: { limit: 5 },
  },
  // Category sections take their heading from the category itself, so no
  // title override. The slugs are the ones hard-coded in the homepage today; a
  // slug with no matching category simply renders nothing.
  {
    key: "category-politics",
    type: "category",
    enabled: true,
    order: 40,
    title: NO_TITLE,
    config: { categorySlug: "politics", limit: 5 },
  },
  {
    key: "category-business",
    type: "category",
    enabled: true,
    order: 50,
    title: NO_TITLE,
    config: { categorySlug: "business", limit: 5 },
  },
  {
    key: "category-sports",
    type: "category",
    enabled: true,
    order: 60,
    title: NO_TITLE,
    config: { categorySlug: "sports", limit: 5 },
  },
  {
    key: "category-entertainment",
    type: "category",
    enabled: true,
    order: 70,
    title: NO_TITLE,
    config: { categorySlug: "entertainment", limit: 5 },
  },
  {
    key: "provinces",
    type: "province",
    enabled: true,
    order: 80,
    title: { np: "प्रदेशका समाचार", en: "News by Province" },
    config: { limit: 6 },
  },
];

// ─── Starter static pages ────────────────────────────────────────────────────
// Markdown. These are generic starter copy, written to match what the site
// actually does today (accounts, moderated comments, newsletter, ad
// placements) — NOT reviewed legal text. See the Phase 0 report.

const ABOUT_NP = `प्रतिध्वनि नेपालको भरपर्दो, स्वतन्त्र र समयमै समाचार दिने डिजिटल पत्रिका हो। सत्य, तथ्य र जनताको आवाजलाई केन्द्रमा राखेर हामी राजनीति, अर्थतन्त्र, खेलकुद, प्रविधि, मनोरञ्जन र स्वास्थ्यका साथै सातै प्रदेशका समाचार प्रकाशन गर्छौं।

## हामी के गर्छौं

- देशभरका ताजा समाचार समयमै पाठकसम्म पुर्‍याउँछौं।
- सातै प्रदेशका स्थानीय समाचारलाई छुट्टै स्थान दिन्छौं।
- पाठकका प्रतिक्रिया र टिप्पणीलाई स्वागत गर्छौं।

## पाठकसँग

तपाईंका सुझाव, सुधार वा समाचार सम्बन्धी जानकारी हामीलाई पठाउन **सम्पर्क** पृष्ठ हेर्नुहोस्।`;

const ABOUT_EN = `Pratidhwani is Nepal's reliable, independent digital newspaper that delivers the news on time. With truth, facts and the voice of the people at the centre, we publish news on politics, business, sports, technology, entertainment and health, along with news from all seven provinces.

## What we do

- We bring the latest news from across the country to readers on time.
- We give local news from all seven provinces a place of its own.
- We welcome readers' reactions and comments.

## For our readers

To send us suggestions, corrections or news tips, see the **Contact** page.`;

const CONTACT_NP = `तपाईंका सुझाव, सुधार वा समाचार सम्बन्धी जानकारी हामीलाई पठाउनुहोस्। हामी पाठकको प्रतिक्रियालाई महत्त्व दिन्छौं।

## समाचार सुझाव र सुधार

कुनै समाचारमा त्रुटि भेटेमा वा नयाँ समाचारको जानकारी भए हामीलाई जानकारी दिनुहोस्।

## विज्ञापन

विज्ञापन सम्बन्धी जानकारीका लागि **विज्ञापन दिनुहोस्** पृष्ठ हेर्नुहोस्।

## समाचार पत्र

ताजा समाचार सीधा तपाईंको इमेलमा पाउन पृष्ठको तल रहेको **समाचार पत्र** मा सदस्यता लिनुहोस्।`;

const CONTACT_EN = `Send us your suggestions, corrections or news tips. We value our readers' feedback.

## News tips and corrections

If you find an error in a story, or know of a story we should cover, let us know.

## Advertising

For advertising enquiries, see the **Advertise With Us** page.

## Newsletter

To get the latest news directly in your inbox, subscribe to the **newsletter** at the bottom of any page.`;

const PRIVACY_NP = `यस पृष्ठले प्रतिध्वनिले तपाईंको कुन जानकारी संकलन गर्छ र त्यसलाई कसरी प्रयोग गर्छ भन्ने कुरा बताउँछ।

## हामीले संकलन गर्ने जानकारी

- **खाता:** खाता खोल्दा तपाईंले दिनुभएको नाम र इमेल ठेगाना। पासवर्ड सुरक्षित रूपमा (एन्क्रिप्टेड हस गरेर) भण्डारण गरिन्छ, सादा रूपमा होइन।
- **टिप्पणी:** तपाईंले समाचारमा लेख्नुभएका टिप्पणी।
- **समाचार पत्र:** तपाईंले सदस्यता लिँदा दिनुभएको इमेल ठेगाना।
- **कुकी:** लगइन अवस्था कायम राख्न प्रयोग हुने कुकी।

## जानकारीको प्रयोग

- खाता सञ्चालन गर्न र तपाईंलाई लगइन राख्न।
- टिप्पणीको समीक्षा गरी स्वीकृत टिप्पणी प्रकाशित गर्न।
- तपाईंले सदस्यता लिएको अवस्थामा समाचार पत्र पठाउन।

## सार्वजनिक जानकारी

स्वीकृत भएका टिप्पणी तपाईंको नामसहित समाचारको पृष्ठमा सार्वजनिक रूपमा देखिन्छन्।

## तपाईंका विकल्प

आफ्नो जानकारी सच्याउन, हटाउन वा समाचार पत्र बन्द गर्न **सम्पर्क** पृष्ठमार्फत हामीलाई अनुरोध गर्न सक्नुहुन्छ।

## नीतिमा परिवर्तन

हामी यो नीति समय समयमा परिवर्तन गर्न सक्छौं। परिवर्तन यही पृष्ठमा प्रकाशित हुनेछ।`;

const PRIVACY_EN = `This page explains what information Pratidhwani collects about you and how it is used.

## Information we collect

- **Account:** the name and email address you provide when you register. Passwords are stored securely (as an encrypted hash), never in plain text.
- **Comments:** the comments you write on articles.
- **Newsletter:** the email address you provide when you subscribe.
- **Cookies:** cookies used to keep you signed in.

## How we use it

- To run your account and keep you signed in.
- To review comments and publish the approved ones.
- To send you the newsletter, if you subscribed.

## Public information

Approved comments appear publicly, with your name, on the article page.

## Your choices

To correct or delete your information, or to stop the newsletter, you can ask us through the **Contact** page.

## Changes to this policy

We may update this policy from time to time. Changes will be published on this page.`;

const TERMS_NP = `प्रतिध्वनि प्रयोग गर्नुभएको खण्डमा तपाईंले यी सर्तहरू स्वीकार गर्नुभएको मानिन्छ।

## सामग्रीको प्रयोग

यस साइटमा प्रकाशित समाचार, तस्बिर र अन्य सामग्री प्रतिध्वनि वा सम्बन्धित स्रोतका हुन्। अनुमति बिना यी सामग्री पुनःप्रकाशन वा व्यावसायिक प्रयोग गर्न पाइँदैन।

## टिप्पणी

- टिप्पणी प्रकाशित हुनुअघि समीक्षा गरिन्छ।
- अपमानजनक, भ्रामक, घृणा फैलाउने वा कानुनविपरीत टिप्पणी प्रकाशित गरिँदैन।
- कुनै टिप्पणी हटाउने वा अस्वीकार गर्ने अधिकार प्रतिध्वनिसँग सुरक्षित छ।

## खाता

तपाईं आफ्नो खाताको सुरक्षा र त्यसबाट हुने गतिविधिका लागि जिम्मेवार हुनुहुन्छ।

## जिम्मेवारीको सीमा

हामी सामग्री सही र समयमै प्रकाशन गर्ने प्रयास गर्छौं, तर त्रुटि वा ढिलाइबाट हुने क्षतिको ग्यारेन्टी दिन सक्दैनौं।

## सर्तमा परिवर्तन

यी सर्तहरू समय समयमा परिवर्तन हुन सक्छन्। परिवर्तन यही पृष्ठमा प्रकाशित हुनेछ।`;

const TERMS_EN = `By using Pratidhwani you agree to these terms.

## Use of content

The news, photographs and other material published on this site belong to Pratidhwani or the respective sources. They may not be republished or used commercially without permission.

## Comments

- Comments are reviewed before they are published.
- Comments that are abusive, misleading, hateful or unlawful will not be published.
- Pratidhwani reserves the right to remove or reject any comment.

## Accounts

You are responsible for the security of your account and for activity carried out through it.

## Limitation of liability

We try to publish accurate content on time, but we cannot guarantee against errors or delays and the losses they may cause.

## Changes to these terms

These terms may change from time to time. Changes will be published on this page.`;

const ADVERTISE_NP = `प्रतिध्वनिमा विज्ञापन दिएर नेपालका पाठकसम्म आफ्नो सन्देश पुर्‍याउनुहोस्।

## विज्ञापन स्थान

हाम्रो साइटमा विभिन्न स्थानमा विज्ञापन देखाउन सकिन्छ:

- **शीर्ष ब्यानर:** सबै पृष्ठको माथि, नेभिगेसनको ठीक मुनि।
- **गृहपृष्ठ ब्यानर:** गृहपृष्ठको मुख्य समाचारपछि।
- **समाचारको माथि र तल:** समाचार पढ्ने पृष्ठमा सामग्रीको अगाडि र पछाडि।
- **साइडबार:** समाचार सूचीका छेउमा।

## सम्पर्क

विज्ञापनको दर र उपलब्धताबारे जान्न **सम्पर्क** पृष्ठमार्फत हामीलाई सम्पर्क गर्नुहोस्।`;

const ADVERTISE_EN = `Advertise on Pratidhwani to put your message in front of readers across Nepal.

## Ad placements

Ads can be shown in several places on our site:

- **Top banner:** at the top of every page, just below the navigation.
- **Homepage banner:** on the homepage, after the top stories.
- **Above and below articles:** before and after the content on article pages.
- **Sidebar:** beside news listings.

## Contact

To ask about rates and availability, reach us through the **Contact** page.`;

export const pagesSeed: PageSeed[] = [
  {
    slug: "about",
    title: { np: "हाम्रो बारे", en: "About Us" },
    body: { np: ABOUT_NP, en: ABOUT_EN },
    isPublished: true,
    showInFooter: true,
  },
  {
    slug: "contact",
    title: { np: "सम्पर्क", en: "Contact" },
    body: { np: CONTACT_NP, en: CONTACT_EN },
    isPublished: true,
    showInFooter: true,
  },
  {
    slug: "privacy",
    title: { np: "गोपनीयता नीति", en: "Privacy Policy" },
    body: { np: PRIVACY_NP, en: PRIVACY_EN },
    isPublished: true,
    showInFooter: true,
  },
  {
    slug: "terms",
    title: { np: "सर्तहरू", en: "Terms" },
    body: { np: TERMS_NP, en: TERMS_EN },
    isPublished: true,
    showInFooter: true,
  },
  {
    slug: "advertise",
    title: { np: "विज्ञापन दिनुहोस्", en: "Advertise With Us" },
    body: { np: ADVERTISE_NP, en: ADVERTISE_EN },
    isPublished: true,
    showInFooter: true,
  },
];
