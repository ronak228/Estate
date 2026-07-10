/**
 * PageLayout — outer wrapper for every authenticated page.
 * Provides consistent max-width, padding, and background color.
 */
const PageLayout = ({ children }) => {
  return (
    <div className="min-h-full bg-app p-4 sm:p-6">
      <div className="max-w-screen-xl mx-auto">{children}</div>
    </div>
  );
};

export default PageLayout;
