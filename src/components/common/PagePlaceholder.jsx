
const PagePlaceholder = ({ title, description }) => {
  return (
    <section className="page-card">
      <span className="page-eyebrow">
        Community Atlas
      </span>

      <h1>{title}</h1>

      <p>{description}</p>

      <div className="page-notice">
        This page is ready for development.
        Its features will be added in the next steps.
      </div>
    </section>
  );
};

export default PagePlaceholder;
