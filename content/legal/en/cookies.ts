import type { LegalDocumentContent } from "../types";

const cookiesDocument: LegalDocumentContent = {
  eyebrow: "Gastronomia Pizza",
  title: "Cookie Policy",
  intro:
    "This policy explains how Gastronomia Pizza uses cookies, browser storage and external services on the website.",

  sections: [
    {
      title: "1. What are cookies and browser storage?",
      paragraphs: [
        "Cookies are small text files that a website can store in your browser. They may be used for purposes such as login, security and remembering your choices.",
        "The website also uses local storage. This stores information locally in your browser, but the information is not automatically sent with every internet request.",
      ],
    },
    {
      title: "2. Necessary cookies",
      paragraphs: [
        "We use Supabase for user authentication and session management. Supabase may store necessary cookies or session tokens in your browser to keep you signed in and protect your account.",
        "This information is necessary if you choose to sign in. It is normally deleted or expires when the session ends, you sign out or the browser storage is cleared.",
      ],
    },
    {
      title: "3. Local storage used by the website",
      paragraphs: [
        {
          label: "cart",
          lines: [
            "Contains the contents of your shopping cart and choices such as delivery method and requested time. This allows the cart to be retained if the page is reloaded.",
          ],
        },
        {
          label: "checkout-customer",
          lines: [
            "Temporarily transfers relevant customer information to the checkout page. The information is removed again by the checkout flow.",
          ],
        },
        {
          label: "checkout-customer-details",
          lines: [
            "May contain contact and delivery information entered during the ordering process, allowing the form to be restored or completed more easily.",
          ],
        },
        {
          label: "checkout-order-note",
          lines: ["Contains any comment you have added to the order."],
        },
        "Checkout information is removed after the payment flow has been completed. Browser storage can also be deleted manually through your browser settings.",
        "If you use a shared computer or phone, we recommend clearing the browser data after placing your order.",
      ],
    },
    {
      title: "4. Payment through Nexi/Nets",
      paragraphs: [
        "When you choose online payment, you are redirected to a payment page operated by Nexi/Nets.",
        "The payment provider may use necessary cookies and technical storage for payment processing, security, fraud prevention and payment card authentication.",
        "These cookies and the associated information are managed by Nexi/Nets in accordance with the payment provider’s own terms and privacy policy.",
      ],
    },
    {
      title: "5. Login with Google or Facebook",
      paragraphs: [
        "Google or Facebook is only contacted during login if you choose the relevant login method.",
        "The login provider may use its own cookies and security technologies. This processing is carried out in accordance with the provider’s own terms and privacy policy.",
      ],
    },
    {
      title: "6. Google Maps",
      paragraphs: [
        "The map in the website footer is not loaded automatically. Google Maps is only contacted if you actively choose to display the map.",
        "When the map is activated, Google may receive technical information such as your IP address, browser information and timestamp, and may use its own cookies or other storage technologies.",
        "If you do not want this processing to take place, you can choose not to activate the map and instead use the displayed address or the directions link.",
      ],
    },
    {
      title: "7. Analytics and marketing",
      paragraphs: [
        "The website does not currently use cookies for visitor analytics, personalised advertising or marketing tracking.",
        "If such services are added in the future, this Cookie Policy and the technical consent solution must be updated before those services are activated.",
      ],
    },
    {
      title: "8. How to delete stored information",
      paragraphs: [
        "You can delete cookies and local storage through your browser settings. The procedure depends on the browser and device you use.",
        "Deleting necessary login information may sign you out. Deleting the cart storage removes the saved products and choices.",
      ],
    },
    {
      title: "9. Contact and further information",
      paragraphs: [
        "If you have questions about cookies or the processing of personal data, you can contact Gastronomia Pizza by phone at +45 40 40 41 83.",
        {
          text: "You can read more about how we process personal data in our",
          link: {
            label: "Privacy Policy",
            href: "/privacy",
          },
        },
      ],
    },
    {
      title: "10. Changes to this policy",
      paragraphs: [
        "This Cookie Policy will be updated if the website’s storage technologies or external services change.",
      ],
    },
  ],

  updated: "Last updated: August 2026",
};

export default cookiesDocument;
