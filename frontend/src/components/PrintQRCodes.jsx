import React from "react";
import QRCode from "react-qr-code";

function downloadSvgAsPng(svgEl, filename, size = 768) {
  // clone svg biar bisa diatur ukuran & background
  const svg = svgEl.cloneNode(true);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));

  // background putih supaya hasil PNG bersih (tidak transparan)
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "white");
  svg.insertBefore(bg, svg.firstChild);

  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(pngBlob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = url;
}

export default function PrintQRCodes() {
  const base = window.location.origin;

  // 20 meja
  const tables = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>QR Customer (20 Meja)</div>
        </div>
      </div>

      <div
        id="print-area"
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {tables.map((t) => {
          const url = `${base}/order?meja=${t}`;
          const svgId = `qr-svg-${t}`;

          return (
            <div
              key={t}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 16,
                textAlign: "center",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900 }}>Meja {t}</div>

              <div style={{ background: "white", padding: 12, display: "inline-block", borderRadius: 12, margin: "0 auto" }}>
                {/* QRCode ini outputnya SVG, jadi bisa kita download bersih */}
                <QRCode id={svgId} value={url} size={170} />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="btn primary"
                  onClick={() => {
                    const svg = document.getElementById(svgId);
                    if (!svg) return;
                    downloadSvgAsPng(svg, `QR-Meja-${t}.png`, 1024); // 1024 biar tajam waktu print
                  }}
                >
                  Download QR (PNG)
                </button>

                <button
                  className="btn ghost"
                  onClick={() => {
                    const svg = document.getElementById(svgId);
                    if (!svg) return;
                    const data = new XMLSerializer().serializeToString(svg);
                    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `QR-Meja-${t}.svg`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  Download SVG
                </button>
              </div>

              {/* ini boleh kamu hapus kalau mau tampilan lebih bersih */}
              <div style={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>{url}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
