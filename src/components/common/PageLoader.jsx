
import { LoaderCircle } from "lucide-react";

import "../../styles/page-loader.css";

export default function PageLoader() {
  return (
    <div
      className="ca-page-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading Community Atlas page"
    >
      <div className="ca-page-loader-content">
        <LoaderCircle
          size={32}
          strokeWidth={2.2}
          className="ca-page-loader-icon"
          aria-hidden="true"
        />

        <strong>
          Loading Community Atlas
        </strong>

        <p>
          Please wait while we prepare your page.
        </p>
      </div>
    </div>
  );
}
