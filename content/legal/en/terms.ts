import type { LegalDocumentContent } from "../types";

const termsDocument: LegalDocumentContent = {
  eyebrow: "Gastronomia Pizza",
  title: "Terms and Conditions",
  intro:
    "We recommend reading these terms and conditions before placing an order. They contain information about ordering, payment, pickup, delivery and other terms that apply when ordering from Gastronomia Pizza.",

  sections: [
    {
      title: "1. Business information",
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
      ],
    },
    {
      title: "2. Ordering",
      paragraphs: [
        "When placing an order through our website, you are responsible for checking that the selected products, quantities, pickup or delivery information and contact details are correct.",
        "Once the order has been completed, you will receive an order confirmation.",
      ],
    },
    {
      title: "3. Prices",
      paragraphs: [
        "All prices shown on the website are stated in Danish kroner (DKK) and include VAT.",
        "The total price of the order is displayed before payment is completed. Any delivery charges or other fees will be shown before payment.",
      ],
    },
    {
      title: "4. Payment",
      paragraphs: [
        "Online payments are processed through Nets Easy. The available payment methods are displayed in the payment window.",
        "Gastronomia Pizza does not receive or store your payment card details. Payment information is processed directly by the payment provider.",
      ],
    },
    {
      title: "5. Pickup",
      paragraphs: [
        "Orders placed for pickup must be collected from:",
        {
          label: "Gastronomia Pizza",
          lines: ["Hillerødvej 38A", "3300 Frederiksværk"],
        },
        "The selected pickup time is shown in your order. This time is an estimate, and minor delays may occur during busy periods.",
      ],
    },
    {
      title: "6. Delivery",
      paragraphs: [
        "If delivery is available for your address, you can select delivery during the ordering process.",
        "The estimated delivery time is displayed when the order is placed. Delivery times are estimates and may be affected by busy periods, traffic and weather conditions.",
        "The customer is responsible for providing the correct delivery address and contact information.",
      ],
    },
    {
      title: "7. Changing or cancelling an order",
      paragraphs: [
        "If you discover an error in your order or wish to change it, please contact us as soon as possible at +45 40 40 41 83.",
        "Whether an order can be changed or cancelled depends, among other things, on whether preparation of the order has already started.",
      ],
    },
    {
      title: "8. Right of withdrawal",
      paragraphs: [
        "The standard 14-day right of withdrawal generally does not apply to food and other products that, due to their nature, deteriorate or expire quickly.",
        "An order therefore cannot be returned after delivery or pickup solely because you have changed your mind.",
      ],
    },
    {
      title: "9. Errors and complaints",
      paragraphs: [
        "If your order contains errors or is incomplete, please contact Gastronomia Pizza as soon as possible at +45 40 40 41 83.",
        "Please provide your order number and a description of the issue so we can process your enquiry as quickly as possible.",
      ],
    },
    {
      title: "10. Refunds",
      paragraphs: [
        "If a full or partial refund is agreed, the refund will generally be issued to the payment method used for the purchase.",
        "Processing times may depend on the payment provider and the customer’s bank.",
      ],
    },
    {
      title: "11. Personal data",
      paragraphs: [
        "Personal data provided in connection with an order is used to process and deliver your order and to provide necessary customer service.",
        {
          text: "Further information about how we process personal data is available in our",
          link: {
            label: "Privacy Policy",
            href: "/privacy",
          },
        },
      ],
    },
    {
      title: "12. Contact",
      paragraphs: [
        "If you have questions about an order or these terms and conditions, please contact:",
        {
          label: "Gastronomia Pizza",
          lines: [
            "Hillerødvej 38A, 3300 Frederiksværk",
            "Phone: +45 40 40 41 83",
          ],
        },
      ],
    },
  ],

  updated: "Last updated: August 2026",
};

export default termsDocument;
