import { useState } from "react";

export default function CustomAccordion({ product }) {
  const [openIndex, setOpenIndex] = useState(null);

  if (!product) return null;

  const items = [
    { title: "Our Specialization", content: product.ourSpecialization },
    { title: "Important Notes", content: product.importantNotes },
  ].filter((item) => item.content);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="custom-accordion">
      {items.map((item, idx) => (
        <div className="accordion-item" key={idx}>
          <button
            className={`accordion-header ${openIndex === idx ? "open" : ""}`}
            onClick={() => toggle(idx)}
          >
            <span>{item.title}</span>
            <span className="arrow">{openIndex === idx ? "▲" : "▼"}</span>
          </button>
          <div className={`accordion-body ${openIndex === idx ? "show" : ""}`}>
            <div dangerouslySetInnerHTML={{ __html: item.content }} />
          </div>
        </div>
      ))}

      <style jsx>{`
        .custom-accordion {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          margin: 20px 0;
          font-family: Arial, sans-serif;
        }
        .accordion-item + .accordion-item {
          border-top: 1px solid #ddd;
        }
        .accordion-header {
          width: 100%;
          padding: 15px 20px;
          background: #f8f8f8;
          border: none;
          outline: none;
          text-align: left;
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .accordion-header:hover {
          background: #eaeaea;
        }
        .accordion-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
          padding: 0 20px;
          background: #fff;
        }
        .accordion-body.show {
          max-height: 500px;
          padding: 15px 20px;
        }
        .arrow {
          font-size: 1rem;
          transition: transform 0.3s ease;
        }
      `}</style>
    </div>
  );
}
