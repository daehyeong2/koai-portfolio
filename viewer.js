import * as pdfjsLib from "./assets/pdfjs/pdf.min.mjs";
import {
  EventBus,
  LinkTarget,
  PDFLinkService,
  PDFViewer,
} from "./assets/pdfjs/pdf_viewer.mjs";

const pdfUrl = new URL("./assets/portfolio.pdf", import.meta.url).href;
const overlayUrl = new URL("./assets/media-overlays.json", import.meta.url).href;

pdfjsLib.GlobalWorkerOptions.workerSrc = "./assets/pdfjs/pdf.worker.min.mjs";

const elements = {
  container: document.getElementById("viewerContainer"),
  viewer: document.getElementById("viewer"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageNumber: document.getElementById("pageNumber"),
  pageCount: document.getElementById("pageCount"),
  zoomOut: document.getElementById("zoomOut"),
  zoomIn: document.getElementById("zoomIn"),
  fitHeight: document.getElementById("fitHeight"),
  statusText: document.getElementById("statusText"),
  progressBar: document.getElementById("progressBar"),
  message: document.getElementById("message"),
};

const eventBus = new EventBus();
const linkService = new PDFLinkService({
  eventBus,
  externalLinkTarget: LinkTarget.BLANK,
  externalLinkRel: "noopener noreferrer",
});

const pdfViewer = new PDFViewer({
  container: elements.container,
  viewer: elements.viewer,
  eventBus,
  linkService,
  annotationMode: pdfjsLib.AnnotationMode.ENABLE,
  imageResourcesPath: "./assets/pdfjs/images/",
});

linkService.setViewer(pdfViewer);

let pdfDocument = null;
let overlays = [];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setMessage(text) {
  elements.message.textContent = text;
  elements.message.hidden = !text;
}

function setProgress(loaded, total) {
  if (!total) {
    elements.progressBar.style.width = "35%";
    elements.progressBar.style.opacity = "1";
    return;
  }

  const percent = clamp(Math.round((loaded / total) * 100), 0, 100);
  elements.progressBar.style.width = `${percent}%`;
  elements.progressBar.style.opacity = percent >= 100 ? "0" : "1";
}

function updateButtons() {
  const page = pdfViewer.currentPageNumber || 1;
  const count = pdfDocument?.numPages || 0;
  elements.pageNumber.value = String(page);
  elements.prevPage.disabled = page <= 1;
  elements.nextPage.disabled = count > 0 && page >= count;
}

function setPage(pageNumber) {
  if (!pdfDocument) {
    return;
  }

  const nextPage = clamp(Number(pageNumber) || 1, 1, pdfDocument.numPages);
  pdfViewer.currentPageNumber = nextPage;
  updateButtons();
}

function zoomBy(multiplier) {
  if (!pdfDocument) {
    return;
  }

  const nextScale = clamp(pdfViewer.currentScale * multiplier, 0.45, 2.8);
  pdfViewer.currentScale = nextScale;
}

async function loadMediaOverlays() {
  try {
    const response = await fetch(overlayUrl, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.overlays || [];
  } catch {
    return [];
  }
}

function applyOverlaysToPage(pageNumber) {
  const pageView = pdfViewer.getPageView(pageNumber - 1);
  const pageElement = pageView?.div;
  if (!pageElement) {
    return;
  }

  pageElement.querySelectorAll("[data-media-overlay]").forEach((node) => node.remove());

  for (const overlay of overlays.filter((item) => Number(item.page) === pageNumber)) {
    if (!overlay.src) {
      continue;
    }

    const media = document.createElement(overlay.type === "video" ? "video" : "img");
    media.className = "media-overlay";
    media.dataset.mediaOverlay = "true";
    media.style.left = `${Number(overlay.left) || 0}%`;
    media.style.top = `${Number(overlay.top) || 0}%`;
    media.style.width = `${Number(overlay.width) || 0}%`;
    media.style.height = `${Number(overlay.height) || 0}%`;

    if (media instanceof HTMLVideoElement) {
      media.src = overlay.src;
      media.autoplay = overlay.autoplay !== false;
      media.loop = overlay.loop !== false;
      media.muted = overlay.muted !== false;
      media.playsInline = true;
      media.controls = overlay.controls === true;
    } else {
      media.src = overlay.src;
      media.alt = overlay.alt || "";
      media.loading = "lazy";
      media.decoding = "async";
    }

    if (overlay.href) {
      const link = document.createElement("a");
      link.href = overlay.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "media-overlay";
      link.dataset.mediaOverlay = "true";
      link.style.left = media.style.left;
      link.style.top = media.style.top;
      link.style.width = media.style.width;
      link.style.height = media.style.height;
      media.style.inset = "0";
      media.style.width = "100%";
      media.style.height = "100%";
      link.append(media);
      pageElement.append(link);
    } else {
      pageElement.append(media);
    }
  }
}

function applyVisibleOverlays() {
  if (!overlays.length || !pdfDocument) {
    return;
  }

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    applyOverlaysToPage(pageNumber);
  }
}

eventBus.on("pagesinit", () => {
  elements.pageCount.textContent = `/ ${pdfDocument.numPages}`;
  elements.pageNumber.max = String(pdfDocument.numPages);
  pdfViewer.currentScaleValue = "page-height";
  updateButtons();
});

eventBus.on("pagechanging", (event) => {
  elements.pageNumber.value = String(event.pageNumber);
  updateButtons();
});

eventBus.on("scalechanging", () => {
  requestAnimationFrame(applyVisibleOverlays);
});

eventBus.on("pagerendered", (event) => {
  applyOverlaysToPage(event.pageNumber);
});

elements.prevPage.addEventListener("click", () => setPage(pdfViewer.currentPageNumber - 1));
elements.nextPage.addEventListener("click", () => setPage(pdfViewer.currentPageNumber + 1));
elements.pageNumber.addEventListener("change", () => setPage(elements.pageNumber.value));
elements.zoomOut.addEventListener("click", () => zoomBy(1 / 1.15));
elements.zoomIn.addEventListener("click", () => zoomBy(1.15));
elements.fitHeight.addEventListener("click", () => {
  if (pdfDocument) {
    pdfViewer.currentScaleValue = "page-height";
  }
});

window.addEventListener("resize", () => {
  if (pdfDocument && pdfViewer.currentScaleValue === "page-height") {
    pdfViewer.currentScaleValue = "page-height";
  }
  requestAnimationFrame(applyVisibleOverlays);
});

async function boot() {
  setMessage("");

  try {
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: "./assets/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "./assets/pdfjs/standard_fonts/",
      wasmUrl: "./assets/pdfjs/wasm/",
      useWorkerFetch: false,
    });

    loadingTask.onProgress = ({ loaded, total }) => setProgress(loaded, total);

    const [pdf, loadedOverlays] = await Promise.all([
      loadingTask.promise,
      loadMediaOverlays(),
    ]);

    pdfDocument = pdf;
    overlays = loadedOverlays;
    document.title = "권대형 | KOAI Portfolio";
    linkService.setDocument(pdfDocument, pdfUrl);
    pdfViewer.setDocument(pdfDocument);

    elements.statusText.textContent = `${pdfDocument.numPages}페이지`;
    setProgress(1, 1);
  } catch (error) {
    console.error(error);
    elements.statusText.textContent = "로드 실패";
    setMessage("PDF를 불러오지 못했습니다. 새로고침하거나 원본 PDF 링크로 확인해 주세요.");
  }
}

boot();
