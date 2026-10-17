// Pulls a PDF or CSV through an authenticated API call and hands it to the
// browser as a file. Going through the API rather than linking a file in
// /public is what keeps one buyer's invoice out of another buyer's reach.
import axios from "axios";

export async function downloadFile(url, fallbackName) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  let res;
  try {
    res = await axios.get(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
      responseType: "blob",
    });
  } catch (err) {
    // A failed request still arrives as a blob, so the message inside it has to
    // be read out before it can be shown
    const data = err?.response?.data;
    if (data && typeof data.text === "function") {
      const text = await data.text();
      let message = "Download failed";
      try {
        message = JSON.parse(text).message || message;
      } catch {
        // not JSON — keep the generic message
      }
      throw new Error(message);
    }
    throw err;
  }

  // The server names the file; the fallback covers a proxy that strips the header
  const disposition = res.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const name = match ? match[1] : fallbackName;

  const href = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = href;
  link.setAttribute("download", name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(href);
}
