"use client";

import Link from "next/link";
import FigmaHeader from "./FigmaHeader";
import SimpleFooter from "./SimpleFooter";

export default function ErrorPageShell({
  title = "Oops! Something went wrong",
  description = "We couldn’t add you to the BeeBuddy list. Please try again in a moment",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bb-site bb-figma-error-site">
      <FigmaHeader />

      <main className="bb-canvas bb-figma-error-canvas">
        {/* Mountain landscape backdrop fade */}
        <div className="bb-error-mountain-backdrop" aria-hidden="true">
          <img
            src="/assets/home/figma-footer-mountains.png"
            alt=""
            className="bb-error-mountain-img"
          />
        </div>

        <div className="bb-figma-error-content-box">
          {/* Sleeping Buzzy Mascot with headphones and zzz */}
          <div className="bb-error-sleeping-buzzy-wrap">
            <img
              src="/assets/buzzy/buzzy_error_sleeping.png"
              alt="Sleeping Buzzy Mascot"
              className="bb-error-sleeping-buzzy-img"
            />
          </div>

          {/* Right text & action */}
          <div className="bb-error-text-column">
            <h1 className="bb-error-title-orange">{title}</h1>
            <p className="bb-error-desc-italic">{description}</p>

            <div className="bb-error-btn-wrap">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="bb-error-done-pill-btn"
                >
                  <span className="text-[#22c55e] font-bold">✓</span>
                  <span>Try Again</span>
                </button>
              ) : (
                <Link href="/" className="bb-error-done-pill-btn">
                  <span className="text-[#22c55e] font-bold">✓</span>
                  <span>Done!</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <SimpleFooter />
    </div>
  );
}
