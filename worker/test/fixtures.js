// Minimal synthetic DOCX containing a single paragraph.
const docx = Buffer.from("UEsDBBQAAAAIAEmzdF1zzjW8dwAAAKAAAAARAAAAd29yZC9kb2N1bWVudC54bWxFzjEOwjAMBdCrVD0ArhgYopC7hMS0FbUdOUYpt6cpA8v7sq0v2TeXJb0J2YadNq6u3cfFrDiAmhakWC9SkI/bU5SiHaPO0ERzUUlY68ozbXCdphtQXHkMvrmH5E/P0tGOhSRsuNtAUV+oHvquq6fl9NeD/0/hC1BLAQIUAxQAAAAIAEmzdF1zzjW8dwAAAKAAAAARAAAAAAAAAAAAAACAAQAAAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAQABAD8AAACmAAAAAAA=", "base64");

function pdf(stream) {
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    ];
    const offsets = [];
    let file = "%PDF-1.4\n";
    for (const [index, object] of objects.entries()) {
        offsets.push(file.length);
        file += `${index + 1} 0 obj\n${object}\nendobj\n`;
    }
    const xref = file.length;
    file += "xref\n0 6\n0000000000 65535 f \n";
    file += offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
    file += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(file);
}

const supported = [
    ["test.pdf", pdf("BT /F1 12 Tf 20 50 Td (context marker) Tj ET")],
    ["test.docx", docx],
    ["test.txt", Buffer.from("context marker")],
    ["test.MD", Buffer.from("# context marker")],
    ["test.py", Buffer.from("# context marker")]
];

const invalid = [
    ["broken.pdf", Buffer.from("invalid PDF")],
    ["broken.docx", Buffer.from("invalid DOCX")],
    ["image.pdf", pdf("q 1 0 0 1 0 0 cm BI /W 1 /H 1 /CS /RGB /BPC 8 ID abc EI Q")],
    ["white.txt", Buffer.from(" \n")],
    ["unsupported.csv", Buffer.from("test")]
];

module.exports = { supported, invalid };
