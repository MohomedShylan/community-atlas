
import { useState } from "react";
import {
  Eye,
  Download,
  FileCheck2,
  FileX2,
  LoaderCircle,
  LockKeyhole,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import "../../styles/member-documents.css";

// ==========================================
// COMMUNITY ATLAS
// SECURE MEMBER DOCUMENT ACCESS
// ==========================================

const DOCUMENT_BUCKET = "ca-member-documents";
const VIEW_EXPIRY_SECONDS = 60;

const DOCUMENT_CONFIG = {
  birth_certificate: {
    labelSi: "6.3 උප්පැන්න සහතිකය",
    labelEn: "Birth Certificate",
    downloadName: "birth-certificate",
  },

  nic_copy: {
    labelSi: "6.5 ජාතික හැඳුනුම්පතේ පිටපත",
    labelEn: "NIC Copy",
    downloadName: "nic-copy",
  },
};

// ==========================================
// VALIDATE STORED DOCUMENT PATH
//
// Expected format:
//
// userId/registrationId/memberId/
// birth_certificate.pdf
//
// or:
//
// userId/registrationId/memberId/nic_copy.jpg
// ==========================================

function isValidDocumentPath(path, type) {
  if (
    typeof path !== "string" ||
    !DOCUMENT_CONFIG[type]
  ) {
    return false;
  }

  const parts = path.split("/");

  if (
    parts.length !== 4 ||
    parts.some((part) => !part)
  ) {
    return false;
  }

  const filename = parts[3];

  const allowedName = new RegExp(
    `^${type}\\.(pdf|jpg|jpeg|png|webp)$`,
    "i"
  );

  return (
    allowedName.test(filename) &&
    !path.includes("..") &&
    !path.includes("\\")
  );
}

function getFileExtension(path) {
  return path.split(".").pop().toLowerCase();
}

function getErrorMessage(error) {
  const message = String(error?.message ?? "");

  if (
    /permission|unauthorized|forbidden|403|row.level|access denied/i
      .test(message)
  ) {
    return (
      "Access denied. Administrators and authorized " +
      "uploaders can access this private document."
    );
  }

  if (
    /not found|404|object not found/i.test(message)
  ) {
    return (
      "Document not found in Supabase Storage. " +
      "Please verify the original upload."
    );
  }

  return (
    "Unable to access this document. " +
    (message || "Please try again.")
  );
}

// ==========================================
// REUSABLE COMPONENT
// ==========================================

export default function MemberDocumentActions({
  type,
  filePath,
  canAccess = false,
}) {
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  const document = DOCUMENT_CONFIG[type];

  if (!document) return null;

  const uploaded =
    typeof filePath === "string" &&
    filePath.trim().length > 0;

  const validPath =
    uploaded &&
    isValidDocumentPath(filePath, type);

  // ========================================
  // VIEW PRIVATE FILE
  // ========================================

  async function handleView() {
    if (
      !canAccess ||
      !validPath ||
      busyAction
    ) {
      return;
    }

    setError("");
    setBusyAction("view");

    let newTab = null;

    try {
      // Open the tab during the user click,
      // before awaiting Supabase.
      //
      // This reduces browser popup blocking.

      newTab = window.open(
        "about:blank",
        "_blank"
      );

      if (!newTab) {
        throw new Error(
          "Your browser blocked the new tab. " +
          "Please allow pop-ups for Community Atlas."
        );
      }

      // Prevent the opened tab from accessing
      // the Community Atlas window.

      newTab.opener = null;

      newTab.document.title =
        "Opening private document";

      newTab.document.body.textContent =
        "Opening your private document...";

      // Create a signed URL valid for
      // only 60 seconds.

      const { data, error: storageError } =
        await supabase.storage
          .from(DOCUMENT_BUCKET)
          .createSignedUrl(
            filePath,
            VIEW_EXPIRY_SECONDS
          );

      if (storageError) {
        throw storageError;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Supabase did not return a document URL."
        );
      }

      if (!newTab.closed) {
        newTab.location.replace(
          data.signedUrl
        );
      }

    } catch (err) {
      if (newTab && !newTab.closed) {
        newTab.close();
      }

      setError(getErrorMessage(err));

    } finally {
      setBusyAction("");
    }
  }

  // ========================================
  // DOWNLOAD PRIVATE FILE
  // ========================================

  async function handleDownload() {
    if (
      !canAccess ||
      !validPath ||
      busyAction
    ) {
      return;
    }

    setError("");
    setBusyAction("download");

    try {
      // Authenticated Supabase request.
      // Access is checked by Storage RLS.

      const { data: fileBlob, error: storageError } =
        await supabase.storage
          .from(DOCUMENT_BUCKET)
          .download(filePath);

      if (storageError) {
        throw storageError;
      }

      if (!fileBlob) {
        throw new Error(
          "The file could not be downloaded."
        );
      }

      // Convert the authorized response into
      // a temporary browser-local URL.

      const objectUrl =
        URL.createObjectURL(fileBlob);

      const extension =
        getFileExtension(filePath);

      const filename =
        `${document.downloadName}.${extension}`;

      const link =
        window.document.createElement("a");

      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";

      window.document.body.appendChild(link);

      link.click();
      link.remove();

      // Clean up the temporary browser URL.
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60000);

    } catch (err) {
      setError(getErrorMessage(err));

    } finally {
      setBusyAction("");
    }
  }

  // ========================================
  // RENDER DOCUMENT CARD
  // ========================================

  return (
    <div className="ca-secure-document">

      <div className="ca-secure-document-header">

        <div className="ca-secure-document-icon">
          {uploaded ? (
            <FileCheck2 size={20} />
          ) : (
            <FileX2 size={20} />
          )}
        </div>

        <div className="ca-secure-document-title">
          <strong>{document.labelSi}</strong>
          <span>{document.labelEn}</span>
        </div>

        <span
          className={
            uploaded
              ? "ca-secure-document-status is-uploaded"
              : "ca-secure-document-status"
          }
        >
          {uploaded
            ? "Uploaded"
            : "Not uploaded"}
        </span>

      </div>

      {uploaded && !canAccess && (
        <p className="ca-secure-document-message">
          <LockKeyhole size={16} />

          You do not have permission to
          access this private document.
        </p>
      )}

      {uploaded && canAccess && !validPath && (
        <p
          className="ca-secure-document-error"
          role="alert"
        >
          <AlertCircle size={16} />

          Invalid saved document reference.
          Please contact an administrator.
        </p>
      )}

      {uploaded && canAccess && validPath && (
        <div className="ca-secure-document-actions">

          <button
            type="button"
            className="ca-secure-document-view"
            disabled={busyAction !== ""}
            onClick={handleView}
          >
            {busyAction === "view" ? (
              <LoaderCircle
                size={16}
                className="ca-document-spinner"
              />
            ) : (
              <Eye size={16} />
            )}

            {busyAction === "view"
              ? "Opening..."
              : "View File"}
          </button>

          <button
            type="button"
            className="ca-secure-document-download"
            disabled={busyAction !== ""}
            onClick={handleDownload}
          >
            {busyAction === "download" ? (
              <LoaderCircle
                size={16}
                className="ca-document-spinner"
              />
            ) : (
              <Download size={16} />
            )}

            {busyAction === "download"
              ? "Downloading..."
              : "Download"}
          </button>

        </div>
      )}

      {error && (
        <p
          className="ca-secure-document-error"
          role="alert"
        >
          <AlertCircle size={16} />
          {error}
        </p>
      )}

    </div>
  );
}
