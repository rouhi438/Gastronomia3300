import type { LegalDocumentContent } from "../types";

const privacyDocument: LegalDocumentContent = {
  eyebrow: "Gastronomia Pizza",
  title: "Privacy Policy",
  intro:
    "This privacy policy explains how Gastronomia Pizza collects, uses and protects your personal data when you use our website, create an account or place an order.",

  sections: [
    {
      title: "1. Data controller",
      paragraphs: [
        {
          label: "Gastronomia Pizza",
          lines: [
            "Hillerødvej 38A",
            "3300 Frederiksværk",
            "CVR: 40954627",
            "Phone: +45 40 40 41 83",
          ],
        },
        "Gastronomia Pizza is the data controller responsible for the processing of personal data described in this privacy policy.",
      ],
    },
    {
      title: "2. Personal data we process",
      paragraphs: [
        "When you place an order, we may process information such as your name, phone number, email address, delivery address, order notes, selected products, delivery method and requested time.",
        "If you create an account or sign in, we may also process your user ID, login information, profile name and information received from the login provider you choose.",
        "We also process order status, payment method, transaction references and information about any refunds. We do not receive or store your full payment card number or security code.",
        "Technical information such as timestamps, IP address, browser information, error messages and security logs may be processed to operate and protect the website.",
      ],
    },
    {
      title: "3. Purposes and legal basis",
      paragraphs: [
        "Information about your order is processed to receive, prepare, deliver or hand over the order, complete the payment and provide customer service. This processing is necessary to fulfil our agreement with you.",
        "Certain information is processed to comply with legal requirements, including bookkeeping and documentation obligations.",
        "Technical logs and security information are processed based on our legitimate interest in protecting the website, preventing misuse and resolving technical issues.",
        "Where processing requires your consent, you may withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing carried out before the consent was withdrawn.",
      ],
    },
    {
      title: "4. Payment",
      paragraphs: [
        "Online payments are processed by Nexi/Nets. You are redirected to the payment provider’s payment page, where your payment information is entered and processed directly.",
        "Gastronomia Pizza only receives the payment references and status information required to connect the payment to your order and process any refunds.",
      ],
    },
    {
      title: "5. Login through external providers",
      paragraphs: [
        "If you choose to sign in using a provider such as Google or Facebook, we receive the limited profile information shared by that provider according to your choices and settings.",
        "The selected login provider also processes information in accordance with its own privacy policy.",
      ],
    },
    {
      title: "6. Recipients and data processors",
      paragraphs: [
        "We use service providers for hosting, databases, user authentication, payments, email and technical operation. These providers may only process information in connection with their agreed services.",
        "Relevant service providers include Supabase, Vercel and Nexi/Nets. Google or Meta may also receive information if you choose their login services or activate content provided by them.",
        "If personal data is processed outside the EU/EEA, the transfer must be based on a valid transfer mechanism and appropriate safeguards.",
      ],
    },
    {
      title: "7. Retention and deletion",
      paragraphs: [
        "We retain personal data for as long as necessary to process your order, provide customer service, document payments and comply with applicable legislation.",
        "Accounting and payment information may be retained for the period required by bookkeeping legislation. Other information is deleted or anonymised when it is no longer required.",
        {
          text: "Information stored locally in your browser can be removed through your browser settings. You can read more in our",
          link: {
            label: "Cookie Policy",
            href: "/cookies",
          },
        },
      ],
    },
    {
      title: "8. Your rights",
      paragraphs: [
        "Depending on the circumstances, you may request access to your personal data and ask us to correct inaccurate information.",
        "You may also request deletion, restriction or delivery of your information and object to certain processing activities. These rights are not absolute and may be limited by legal requirements or necessary documentation obligations.",
        "To exercise your rights, contact us by phone at +45 40 40 41 83 or write to the restaurant at the address stated above.",
      ],
    },
    {
      title: "9. Complaints",
      paragraphs: [
        "If you are dissatisfied with how we process your personal data, we recommend that you contact us first.",
        {
          text: "You may also submit a complaint to the Danish Data Protection Agency at",
          link: {
            label: "datatilsynet.dk",
            href: "https://www.datatilsynet.dk",
            external: true,
          },
        },
      ],
    },
    {
      title: "10. Automated decision-making",
      paragraphs: [
        "We do not use your personal data for automated decision-making or profiling that produces legal effects or similarly significantly affects you.",
      ],
    },
    {
      title: "11. Feedback and public ratings",
      paragraphs: [
        "After an order is completed, you may choose to submit a rating from 1 to 5 stars and an optional private message to the restaurant within seven days.",
        "The rating and private message are processed to improve the restaurant’s service, handle customer enquiries and document feedback from verified orders. This processing is based on our legitimate interest in quality assurance and customer service.",
        "The star rating may contribute to the restaurant’s public average and total rating count. The public statistics do not display your surname, order number, email address, private message or the restaurant’s private reply.",
        "You may separately and voluntarily consent to the public display of your first name and star rating. Consent is not preselected and may be withdrawn at any time through the secure order link. When consent is withdrawn, the first name is removed from public display, while the star rating may continue to contribute to the aggregate rating.",
        "Private messages and the restaurant’s replies are available only through the secure order page and to authorised administrators. Offensive, threatening or discriminatory messages may be removed by the restaurant while the star rating is retained.",
        "Feedback is generally retained for as long as the related order is retained, unless the information must be deleted or anonymised earlier under applicable rules.",
      ],
    },
    {
      title: "12. Changes to this policy",
      paragraphs: [
        "We may update this privacy policy if the website, our service providers or our processing of personal data changes. The current version will always be available on this page.",
      ],
    },
  ],

  updated: "Last updated: August 2026",
};

export default privacyDocument;
