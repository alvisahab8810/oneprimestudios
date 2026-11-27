// Trust signals for retail (B2C) product pages only. Every line here describes
// something the store actually does, so nothing is promised that a buyer
// could later find untrue.
import { FaShieldAlt, FaLock, FaCheckCircle, FaShippingFast, FaWhatsapp, FaStar } from "react-icons/fa";

const GREEN = "#15803d";

// Small pill shown beside the stock badge, under the product title
export function TrustedPill({ rating = 0, reviews = 0 }) {
  return (
    <span className="ops-trusted-pill" title="Sold and printed by One Prime Studios">
      <FaShieldAlt size={12} aria-hidden="true" />
      Trusted
      {reviews > 0 && (
        <span className="ops-trusted-rating">
          <FaStar size={11} aria-hidden="true" />
          {Number(rating).toFixed(1)} ({reviews})
        </span>
      )}
      <style jsx>{`
        .ops-trusted-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 6px;
          background: #ecfdf3;
          border: 1px solid #bbf7d0;
          color: ${GREEN};
          font-size: 12.5px;
          font-weight: 700;
          line-height: 1.4;
          vertical-align: middle;
        }
        .ops-trusted-rating {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin-left: 4px;
          padding-left: 7px;
          border-left: 1px solid #bbf7d0;
          color: #111111;
          font-weight: 600;
        }
        .ops-trusted-rating :global(svg) {
          color: #f59e0b;
        }
      `}</style>
    </span>
  );
}

// The strip of reasons to buy, shown under the Add to Cart button
export default function TrustBadges({ whatsappSupport = false }) {
  const items = [
    { icon: FaLock, title: "Secure payments", text: "Paid through Razorpay" },
    { icon: FaCheckCircle, title: "Quality checked", text: "Every order checked before dispatch" },
    { icon: FaShippingFast, title: "Tracked delivery", text: "Shipped across India with tracking" },
  ];
  if (whatsappSupport) {
    items.push({ icon: FaWhatsapp, title: "Real support", text: "Talk to us on WhatsApp" });
  }

  return (
    <div className="ops-trust" aria-label="Why buy from One Prime Studios">
      <div className="ops-trust-head">
        <FaShieldAlt size={15} aria-hidden="true" />
        <span>Trusted by One Prime Studios</span>
      </div>
      <ul className="ops-trust-list">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <Icon size={18} aria-hidden="true" className="ops-trust-icon" />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .ops-trust {
          margin-top: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          overflow: hidden;
        }
        .ops-trust-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          background: #ecfdf3;
          border-bottom: 1px solid #bbf7d0;
          color: ${GREEN};
          font-size: 13.5px;
          font-weight: 700;
        }
        .ops-trust-list {
          list-style: none;
          margin: 0;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px 16px;
        }
        .ops-trust-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }
        .ops-trust-list li :global(.ops-trust-icon) {
          color: ${GREEN};
          flex-shrink: 0;
          margin-top: 2px;
        }
        .ops-trust-list strong {
          display: block;
          font-size: 13.5px;
          color: #111111;
          line-height: 1.3;
        }
        .ops-trust-list small {
          display: block;
          font-size: 12px;
          color: #64748b;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
