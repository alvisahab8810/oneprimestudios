import React, { useState } from 'react';

const faqData = [
  {
    question: "What types of printing services do you offer?",
    answer:
      "We provide a wide range of printing solutions including business cards, flyers, brochures, banners, posters, packaging, corporate stationery, and custom merchandise. Both digital and offset printing options are available depending on your needs.",
  },
  {
    question: "Can I print in small quantities, or do you have a minimum order requirement?",
    answer: "We provide a wide range of printing solutions including business cards, flyers, brochures, banners, posters, packaging, corporate stationery, and custom merchandise. Both digital and offset printing options are available depending on your needs.",
  },
  {
    question: "Do you offer design support if I don’t have ready artwork?",
    answer: "We provide a wide range of printing solutions including business cards, flyers, brochures, banners, posters, packaging, corporate stationery, and custom merchandise. Both digital and offset printing options are available depending on your needs.",
  },
  {
    question: "How long does it take to complete an order?",
    answer: "We provide a wide range of printing solutions including business cards, flyers, brochures, banners, posters, packaging, corporate stationery, and custom merchandise. Both digital and offset printing options are available depending on your needs.",
  },
];

const FaqAccordion = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="custom-accrodion-bx">
      <h2>
        <span className="text-gradient">FAQ:</span> Frequently Asked Questions
      </h2>
      <div className="accordion" id="faqAccordion">
        {faqData.map((faq, index) => (
          <div className="accordion-item custom-accordion-item mb-3" key={index}>
            <h2 className="accordion-header">
              <button
                className={`accordion-button d-flex justify-between align-items-center ${
                  openIndex === index ? '' : 'collapsed'
                }`}
                type="button"
                onClick={() => toggle(index)}
              >
                <span className="question-text">{faq.question}</span>
                <span className="toggle-icon">{openIndex === index ? '×' : '+'}</span>
              </button>
            </h2>
            <div className={`accordion-collapse collapse ${openIndex === index ? 'show' : ''}`}>
              <div className="accordion-body">{faq.answer}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaqAccordion;
