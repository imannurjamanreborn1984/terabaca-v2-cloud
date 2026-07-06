const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3005; 

// Gunakan Memory Storage Multer agar file tidak disimpan di disk lokal Vercel (mencegah Read-Only Error)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./'));

// ====================================================================
// KONEKSI UTAMA KE SUPABASE CLOUD 
// ====================================================================
const SUPABASE_URL = "https://eallancevdgckokrqbmz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1jT0rUfsKIFYynm5tgyapw__2zBk-0U";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KUNCI_RAHASIA_KABAG = "kabagterabaca";
const KUNCI_RAHASIA_ADMIN = "adminterabaca";

// Data Master Paket Statis Sesuai Request image_b33f78.png
const hargaPaketMaster = {
    basic:  { nama: "Paket Basic", personal: 350000, lembaga: 175000 },
    parent: { nama: "Paket Parent", personal: 350000, lembaga: 175000 },
    talent: { nama: "Paket Talent", personal: 600000, lembaga: 450000 }
};

let sessionSandiBenar = false; 

// Middleware Pos Satpam Internal
function pastikanInternal(req, res, next) {
    if (sessionSandiBenar === true) { next(); } 
    else {
        res.send(`
            <div style="font-family:'Segoe UI', sans-serif; text-align:center; padding-top:100px; max-width:500px; margin:0 auto;">
                <h1 style="color:#ef4444; font-size:42px; margin-bottom:10px;">🔒 AKSES DITOLAK</h1>
                <p style="color:#4b5563;">Halaman dapur internal TERABACA ini dilindungi sandi khusus rahasia pengurus.</p>
                <a href="/internal/login-page" style="background-color:#1e293b; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block; margin-top:15px;">Masukan Kata Sandi Rahasia</a>
            </div>
        `);
    }
}

// Helper Fungsi: Upload File Langsung Ke Supabase Storage Bucket
async function uploadKeSupabaseStorage(file, prefix = 'file') {
    if (!file) return 'tidak_ada_file.png';
    const namaFileUnik = `${prefix}-${Date.now()}${path.extname(file.originalname)}`;
    
    const { data, error } = await supabase.storage
        .from('terabaca-files')
        .upload(namaFileUnik, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error("Gagal Upload Storage Supabase:", error.message);
        return 'error_upload.png';
    }
    
    // Ambil Link URL Publik Gambar di Supabase Cloud
    const { data: linkPublik } = supabase.storage.from('terabaca-files').getPublicUrl(namaFileUnik);
    return linkPublik.publicUrl;
}

// 1. HALAMAN UTAMA / PORTAL UTAMA
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 650px; margin: 40px auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <h2 style="color: #1e3a8a; text-align: center; margin-bottom: 5px;">Portal Utama TERABACA V2</h2>
            <p style="color: #6b7280; text-align: center; margin-top: 0; font-size: 14px;">Kabupaten Tasikmalaya (Cloud Connected)</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <div style="margin-bottom: 20px; padding: 15px; border: 1px dashed #3b82f6; border-radius: 6px; background-color: #f0f9ff;">
                <h4 style="margin: 0 0 10px 0; color: #1d4ed8;">📋 JALUR PENDAFTARAN KLIEN BARU</h4>
                <div style="display: flex; gap: 10px;">
                    <a href="/portal/sekolah-baru" style="flex: 1; text-align: center; background-color: #ef4444; color: white; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">Sekolah Baru</a>
                    <a href="/portal/sekolah-lama" style="flex: 1; text-align: center; background-color: #10b981; color: white; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">Repeat Order Sekolah</a>
                    <a href="/portal/personal" style="flex: 1; text-align: center; background-color: #8b5cf6; color: white; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">Klien Personal</a>
                </div>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #10b981; border-radius: 6px; background-color: #f0fdf4;">
                <h4 style="margin: 0 0 5px 0; color: #155e75;">📥 PORTAL MANDIRI KLIEN (WORKSPACE & INVOICE)</h4>
                <p style="margin: 0 0 12px 0; font-size: 12px; color: #4b5563;">Masukkan ID Order Anda di bawah ini untuk melihat Invoice atau mengunggah berkas siswa:</p>
                <form action="/portal/cek-akses-klien" method="POST" style="display:flex; gap:10px;">
                    <input type="text" name="id_order_input" placeholder="Contoh: TRBC-1234" required style="flex:1; padding:8px; border:1px solid #ccc; border-radius:6px;">
                    <button type="submit" style="background-color:#10b981; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer;">Buka Portal Klien</button>
                </form>
            </div>

            <div style="padding: 15px; border: 1px solid #1e293b; border-radius: 6px; background-color: #f8fafc; text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #0f172a; text-align: left;">⚙ RUANG INTERNAL (KABAG & ADMIN)</h4>
                <a href="/internal/login-page" style="display: block; background-color: #1e293b; color: white; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                    🔒 Masuk ke Dashboard Manajemen Kinerja
                </a>
            </div>
        </div>
    `);
});

// ROUTE POST: SINKRONISASI DATABASE BARU KE SUPABASE POSTGRESQL
app.post('/proses-pendaftaran', upload.single('bukti_bayar'), async (req, res) => {
    const { jenis_pendaftar, kategori, nama_klien, kode_paket, jumlah_testee, kontak, sub_kategori, tgl_pelaksanaan, tgl_saji } = req.body;
    
    const infoPaketTerpilih = hargaPaketMaster[kode_paket];
    const hargaSatuan = (jenis_pendaftar === 'personal') ? infoPaketTerpilih.personal : infoPaketTerpilih.lembaga;
    const totalTagihan = hargaSatuan * parseInt(jumlah_testee || 1);
    
    // Upload bukti bayar langsung ke awan Supabase Storage
    const linkBuktiBayarCloud = await uploadKeSupabaseStorage(req.file, 'bukti');

    let listNamaAnak = [];
    for(let i = 1; i <= parseInt(jumlah_testee || 1); i++) {
        listNamaAnak.push({
            idSiswa: i,
            namaSiswa: `Siswa Slot ke-${i}`, 
            gender: '-',
            keterangan: '-',
            fileScanLokal: 'Belum Ada',
            statusFormPusat: '❌ Belum Dikirim ke Google Form'
        });
    }

    const idOrderBaru = 'TRBC-' + Math.floor(Math.random() * 9000 + 1000);

    // INSERT DATA KE DATABASE SUPABASE RESMI
    const { error } = await supabase.from('orders').insert([{
        id_order: idOrderBaru,
        kategori: kategori,
        sub_kategori: sub_kategori,
        nama_klien: nama_klien,
        nama_paket: infoPaketTerpilih.nama,
        jumlah_testee: parseInt(jumlah_testee || 1),
        kontak: kontak,
        harga_satuan: hargaSatuan,
        total_tagihan: totalTagihan,
        tgl_pelaksanaan: tgl_pelaksanaan,
        tgl_saji: tgl_saji || 'Menyesuaikan',
        bukti_bayar_file: linkBuktiBayarCloud,
        data_siswa: listNamaAnak
    }]);

    if(error) return res.status(500).send("Database Supabase Gagal Menyimpan: " + error.message);

    res.send(`
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
            <h2 style="color: #10b981;">✔ Pendaftaran Sukses Tersimpan di Cloud!</h2>
            <p style="font-size:16px;">ID Order Anda: <b style="color:#1e3a8a; font-size:20px;">${idOrderBaru}</b></p>
            <hr style="border:0; border-top:1px solid #e5e7eb; margin:20px 0;">
            <div style="display:flex; gap:10px; justify-content:center;">
                <a href="/portal/workspace-klien/${idOrderBaru}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight:bold;">Lihat Workspace & Invoice</a>
                <a href="/" style="background-color: #1f2937; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight:bold;">Kembali ke Beranda</a>
            </div>
        </div>
    `);
});

// ROUTE POST: CEK AKSES MASUK KLIEN LEWAT ID ORDER DI SUPABASE
app.post('/portal/cek-akses-klien', async (req, res) => {
    const { id_order_input } = req.body;
    const { data: order, error } = await supabase.from('orders').select('*').eq('id_order', id_order_input.trim().toUpperCase()).single();
    
    if (order) { res.redirect(`/portal/workspace-klien/${order.id_order}`); } 
    else { res.send(`<script>alert("ID Order tidak valid atau tidak terdaftar!"); window.location.href = "/";</script>`); }
});

// ROUTE POST: PARSING PASTE MASSAL EXCEL/SPREADSHEET MULTI-KOLOM KE SUPABASE
app.post('/portal/update-nama-massal/:idOrder', async (req, res) => {
    const idOrder = req.params.idOrder;
    const { list_nama_textarea, asal_halaman } = req.body;
    
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    
    if (order && list_nama_textarea) {
        const barisSiswa = list_nama_textarea.split('\n').map(b => b.trim()).filter(b => b !== "");
        let listSiswaUpdate = order.data_siswa;

        listSiswaUpdate.forEach((siswa, index) => {
            if (barisSiswa[index]) {
                const kolomData = barisSiswa[index].split('\t');
                siswa.namaSiswa = kolomData[0] ? kolomData[0].trim() : siswa.namaSiswa;
                siswa.gender    = kolomData[1] ? kolomData[1].trim() : '-';
                siswa.keterangan  = kolomData[2] ? kolomData[2].trim() : '-';
            }
        });

        // Update struktur data_siswa JSONB di cloud database
        await supabase.from('orders').update({ data_siswa: listSiswaUpdate }).eq('id_order', idOrder);
    }
    
    if(asal_halaman === 'internal') { res.redirect(`/internal/lihat-siswa/${idOrder}`); } 
    else { res.redirect(`/portal/workspace-klien/${idOrder}`); }
});

// ROUTE POST: PROSES UPLOAD MANDIRI GAMBAR SISWA LANGSUNG TERBANG KE STORAGE BUCKET
app.post('/portal/upload-mandiri-siswa/:idOrder/:idSiswa', upload.single('dokumen_testee'), async (req, res) => {
    const { idOrder, idSiswa } = req.params;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    
    if (order && req.file) {
        let listSiswaUpdate = order.data_siswa;
        const siswa = listSiswaUpdate.find(s => s.idSiswa == idSiswa);
        
        if (siswa) {
            const linkBerkasCloud = await uploadKeSupabaseStorage(req.file, `testee-${idOrder}`);
            siswa.fileScanLokal = linkBerkasCloud; // Menyimpan alamat link Supabase publik online-nya
        }
        await supabase.from('orders').update({ data_siswa: listSiswaUpdate }).eq('id_order', idOrder);
    }
    res.redirect(`/portal/workspace-klien/${idOrder}`);
});

// WORKSPACE KLIEN PUBLIK
app.get('/portal/workspace-klien/:id', async (req, res) => {
    const idOrder = req.params.id;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    if (!order) return res.send("Data tidak ditemukan.");
    
    let daftarAnakFormHtml = '';
    order.data_siswa.forEach((siswa) => {
        const isUploaded = siswa.fileScanLokal.startsWith('http');
        daftarAnakFormHtml += `
            <div style="padding:15px; background:#fff; border:1px solid #e5e7eb; border-radius:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-weight:bold; color:#1e293b;">👤 ${siswa.namaSiswa}</span> 
                    <span style="background:#e2e8f0; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:5px;">${siswa.gender}</span>
                    <span style="background:#dbeafe; color:#1e40af; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:5px;">${siswa.keterangan}</span>
                    <br><small style="color:#6b7280; display:block; margin-top:4px;">Berkas Scan: ${isUploaded ? `<a href="${siswa.fileScanLokal}" target="_blank" style="color:#10b981; font-weight:bold;">✅ Lihat Berkas Online</a>` : '❌ Belum Ada Berkas Gambar'}</small>
                </div>
                <form action="/portal/upload-mandiri-siswa/${order.id_order}/${siswa.idSiswa}" method="POST" enctype="multipart/form-data" style="margin:0; display:flex; gap:5px; align-items:center;">
                    <input type="file" name="dokumen_testee" required style="font-size:12px; max-width:180px;">
                    <button type="submit" style="background-color:#2563eb; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">Upload</button>
                </form>
            </div>`;
    });

    res.send(`
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 750px; margin: 40px auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background:#fafafa;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <a href="/" style="text-decoration: none; color: #2563eb; font-size: 14px;">← Kembali ke Beranda</a>
                <a href="/portal/invoice/${order.id_order}" target="_blank" style="background-color:#1e3a8a; color:white; padding:8px 15px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:bold;">🧾 Lihat & Cetak Invoice</a>
            </div>
            <h3 style="color:#10b981; margin-top:15px; margin-bottom:5px;">📁 Lembar Kerja Mandiri Terabaca</h3>
            <p style="margin:0; font-size:14px; color:#4b5563;">Klien / Lembaga: <b>${order.nama_klien}</b> [${order.id_order}] | Paket: <b>${order.nama_paket}</b></p>
            <hr style="border:0; border-top:1px solid #e5e7eb; margin:15px 0;">
            
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #cbd5e1;">
                <b style="color: #1e293b; font-size: 14px; display:block; margin-bottom:3px;">📋 Sinkronisasi Massal via Template Spreadsheet (image_b4b2a4.png)</b>
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #4b5563;">Susun data di Excel Anda menjadi 3 kolom: <b>[Nama Lengkap]</b>, <b>[Jenis Kelamin L/P]</b>, dan <b>[Kelas/Identitas Lain]</b>. Blok & Copy semua baris siswa Anda, lalu langsung paste ke kotak di bawah ini:</p>
                
                <table style="font-size:11px; color:#475569; margin-bottom:10px; border-collapse:collapse; background:#fff; width:100%; border:1px solid #cbd5e1;">
                    <tr style="background:#e2e8f0; font-weight:bold;"><td style="padding:4px; border:1px solid #cbd5e1;">Kolom A (Nama)</td><td style="padding:4px; border:1px solid #cbd5e1;">Kolom B (L/P)</td><td style="padding:4px; border:1px solid #cbd5e1;">Kolom C (Kelas/Identitas)</td></tr>
                    <tr><td style="padding:4px; border:1px solid #cbd5e1; font-style:italic;">Ahmad Junaedi</td><td style="padding:4px; border:1px solid #cbd5e1; font-style:italic;">L</td><td style="padding:4px; border:1px solid #cbd5e1; font-style:italic;">Kelas B1 PAUD</td></tr>
                </table>

                <form action="/portal/update-nama-massal/${order.id_order}" method="POST">
                    <input type="hidden" name="asal_halaman" value="klien">
                    <textarea name="list_nama_textarea" rows="5" placeholder="Tempel blok kolom spreadsheet Anda di sini..." required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:monospace; box-sizing:border-box; font-size:12px; resize:vertical; background:#fff;"></textarea>
                    <button type="submit" style="margin-top:8px; background-color:#10b981; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">⚡ Sinkronisasi Data Spreadsheet</button>
                </form>
            </div>

            <div style="margin-top:15px;">${daftarAnakFormHtml}</div>
        </div>
    `);
});

// INVOICE NOTA RESMI
app.get('/portal/invoice/:id', async (req, res) => {
    const idOrder = req.params.id;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    const { data: settingBank } = await supabase.from('settings').select('value').eq('key', 'info_rekening').single();
    
    if (!order) return res.send("Invoice tidak ditemukan.");
    const infoBank = settingBank.value;

    res.send(`<div style="font-family:'Segoe UI',sans-serif;max-width:650px;margin:30px auto;padding:30px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;"><div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e3a8a;padding-bottom:15px;"><div><h2 style="color:#1e3a8a;margin:0 0 5px 0;">TERABACA Kab. Tasikmalaya</h2><p style="margin:0;font-size:12px;font-style:italic;">"Nalungtik Titik Manggih Diri"</p></div></div><table style="width:100%;margin-top:25px;font-size:13px;"><thead><tr style="background:#f1f5f9;text-align:left;"><th style="padding:10px;">Paket</th><th style="padding:10px;text-align:center;">Kuota</th><th style="padding:10px;text-align:right;">Satuan</th><th style="padding:10px;text-align:right;">Total</th></tr></thead><tbody><tr><td style="padding:10px;"><b>Asesmen (${order.nama_paket})</b></td><td style="padding:10px;text-align:center;">${order.jumlah_testee}</td><td style="padding:10px;text-align:right;">Rp ${order.harga_satuan.toLocaleString('id-ID')}</td><td style="padding:10px;text-align:right;font-weight:bold;">Rp ${order.total_tagihan.toLocaleString('id-ID')}</td></tr></tbody></table><p style="font-size:12px;margin-top:20px;">Info Transfer: ${infoBank.bank} - ${infoBank.nomorRekening} a.n. ${infoBank.atasNama}</p></div>`);
});

// ROUTE MENU FORM REGISTRASI
app.get('/portal/sekolah-:tipe', (req, res) => {
    const tipeSekolah = req.params.tipe;
    res.send(`<div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:40px auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;"><h3>Form Lembaga (${tipeSekolah.toUpperCase()})</h3><form action="/proses-pendaftaran" method="POST" enctype="multipart/form-data"><input type="hidden" name="jenis_pendaftar" value="lembaga"><input type="hidden" name="kategori" value="Lembaga (${tipeSekolah})"><label>Nama Sekolah:</label><input type="text" name="nama_klien" required style="width:100%;padding:8px;margin-bottom:10px;"><label>Pilih Paket:</label><select name="kode_paket" style="width:100%;padding:8px;margin-bottom:10px;"><option value="basic">Basic</option><option value="parent">Parent</option><option value="talent">Talent</option></select><label>Jumlah Testee:</label><input type="number" name="jumlah_testee" required style="width:100%;padding:8px;margin-bottom:10px;"><label>WhatsApp:</label><input type="text" name="kontak" required style="width:100%;padding:8px;margin-bottom:10px;"><label>Tanggal Tes:</label><input type="date" name="tgl_pelaksanaan" required style="width:100%;padding:8px;margin-bottom:15px;"><label>Bukti DP Pembayaran:</label><input type="file" name="bukti_bayar" required><br><br><button type="submit" style="width:100%;padding:10px;background:#1e3a8a;color:#fff;border:none;">Kirim</button></form></div>`);
});
app.get('/portal/personal', (req, res) => {
    res.send(`<div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:40px auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;"><h3>Form Personal</h3><form action="/proses-pendaftaran" method="POST" enctype="multipart/form-data"><input type="hidden" name="jenis_pendaftar" value="personal"><input type="hidden" name="kategori" value="Personal"><input type="hidden" name="jumlah_testee" value="1"><label>Nama Testee:</label><input type="text" name="nama_klien" required style="width:100%;padding:8px;margin-bottom:10px;"><label>Pilih Paket:</label><select name="kode_paket" style="width:100%;padding:8px;margin-bottom:10px;"><option value="basic">Basic</option><option value="parent">Parent</option><option value="talent">Talent</option></select><label>WhatsApp:</label><input type="text" name="kontak" required style="width:100%;padding:8px;margin-bottom:10px;"><label>Tanggal Tes:</label><input type="date" name="tgl_pelaksanaan" required style="width:100%;padding:8px;margin-bottom:15px;"><label>Bukti Pembayaran:</label><input type="file" name="bukti_bayar" required><br><br><button type="submit" style="width:100%;padding:10px;background:#8b5cf6;color:#fff;border:none;">Kirim</button></form></div>`);
});

// LOGIN INTERNAL
app.get('/internal/login-page', (req, res) => {
    const errorMsg = req.query.error ? `<p style="color:#ef4444; font-size:13px; font-weight:bold;">❌ Kata sandi salah!</p>` : '';
    res.send(`<div style="font-family:'Segoe UI',sans-serif;max-width:400px;margin:80px auto;padding:30px;border:1px solid #e5e7eb;border-radius:8px;text-align:center;"><h3>Verifikasi Internal Terabaca</h3>${errorMsg}<form action="/internal/proses-verifikasi" method="POST" style="text-align:left;"><label style="display:block;font-size:12px;font-weight:bold;margin-bottom:8px;">Masukkan Kata Sandi Rahasia:</label><input type="password" name="sandi_input" required style="width:100%;padding:11px;margin-bottom:20px;border:1px solid #ccc;border-radius:6px;"><button type="submit" style="width:100%;background-color:#1e293b;color:white;padding:12px;border:none;border-radius:6px;font-weight:bold;">Buka Ruang Internal 🔓</button></form></div>`);
});
app.post('/internal/proses-verifikasi', (req, res) => {
    if (req.body.sandi_input === KUNCI_RAHASIA_KABAG || req.body.sandi_input === KUNCI_RAHASIA_ADMIN) { sessionSandiBenar = true; res.redirect('/internal/dashboard'); } 
    else { sessionSandiBenar = false; res.redirect('/internal/login-page?error=true'); }
});
app.get('/internal/logout', (req, res) => { sessionSandiBenar = false; res.redirect('/'); });

// DASHBOARD UTAMA MANAJEMEN INTERNAL (DITARIK DARI CLOUD SUPABASE)
app.get('/internal/dashboard', pastikanInternal, async (req, res) => {
    const { data: listOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: settingPraktisi } = await supabase.from('settings').select('value').eq('key', 'daftar_praktisi').single();
    
    const daftarPraktisi = settingPraktisi.value;
    let barisTabel = '';
    
    (listOrders || []).forEach((order) => {
        let opsiPraktisiLap = `<option value="">-- Pilih Praktisi Lap --</option>`; let opsiPraktisiSaji = `<option value="">-- Pilih Praktisi Saji --</option>`;
        daftarPraktisi.forEach(p => { 
            opsiPraktisiLap += `<option value="${p}" ${order.praktisi_lapangan === p ? 'selected' : ''}>${p}</option>`; 
            opsiPraktisiSaji += `<option value="${p}" ${order.praktisi_saji === p ? 'selected' : ''}>${p}</option>`; 
        });
        
        const berkasSiap = order.data_siswa.filter(s => s.fileScanLokal.startsWith('http')).length;
        barisTabel += `<tr style="border-bottom:1px solid #e5e7eb;font-size:13px;"><td style="padding:12px;"><b>${order.id_order}</b></td><td style="padding:12px;"><b>${order.nama_klien}</b><br><small style="color:#2563eb; font-weight:bold;">${order.nama_paket}</small><br><a href="/internal/lihat-siswa/${order.id_order}" style="color:#2563eb;font-weight:bold;font-size:11px;">🔎 Kelola Berkas Anak (${berkasSiap}/${order.jumlah_testee} Siap)</a></td><td style="padding:12px;text-align:center;">${order.jumlah_testee}</td><td style="padding:12px;">Rp ${order.total_tagihan.toLocaleString('id-ID')}<br>${order.status_pembayaran==='Lunas'?`<span style="color:#10b981;font-weight:bold;">✔ Lunas</span>`:`<a href="/internal/lunaskan/${order.id_order}">Set Lunas</a>`}</td><td style="padding:12px;"><form action="/internal/plot-tim/${order.id_order}" method="POST" style="display:flex;flex-direction:column;gap:3px;"><select name="praktisi_lapangan" style="font-size:10px;">${opsiPraktisiLap}</select><select name="praktisi_saji" style="font-size:10px;">${opsiPraktisiSaji}</select><button type="submit" style="font-size:10px;">Simpan Tim</button></form></td><td style="padding:12px;font-size:11px;"><b>Lap:</b> ${order.praktisi_lapangan}<br><b>Saji:</b> ${order.praktisi_saji}</td><td style="padding:12px;text-align:center;"><div>${order.status_upload_pusat}</div><a href="/internal/upload-pusat/${order.id_order}" style="font-size:10px;">📤 Struk Pusat</a></td></tr>`;
    });
    res.send(`<div style="font-family:'Segoe UI',sans-serif;padding:25px;"><div style="display:flex;justify-content:space-between;align-items:center;"><h2>📊 Dashboard Cloud Kantor Cabang Tasikmalaya</h2><div style="display:flex; gap:10px;"><a href="/internal/pengaturan" style="background-color:#4b5563;color:white;padding:8px 15px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">⚙ Pengaturan Sistem</a><a href="/internal/logout" style="background-color:#ef4444;color:white;padding:8px 15px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">🔒 Logout</a></div></div><table style="width:100%;border-collapse:collapse;margin-top:20px;border:1px solid #e5e7eb;"><thead><tr style="background-color:#1e293b;color:white;text-align:left;font-size:13px;"><th style="padding:12px;">ID</th><th style="padding:12px;">Nama Klien</th><th style="padding:12px;text-align:center;">Testee</th><th style="padding:12px;">Keuangan</th><th style="padding:12px;">Plotting Tim</th><th style="padding:12px;">Status Tim</th><th style="padding:12px;text-align:center;">Setoran Pusat</th></tr></thead><tbody>${barisTabel || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#9ca3af;">Belum ada data pendaftaran di Supabase cloud.</td></tr>'}</tbody></table></div>`);
});

// DETAIL BERKAS SISWA DI DASHBOARD INTERNAL
app.get('/internal/lihat-siswa/:id', pastikanInternal, async (req, res) => {
    const idOrder = req.params.id;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    if(!order) return res.send("Data tidak ditemukan."); 
    
    let daftarAnakHtml = ''; 
    order.data_siswa.forEach((siswa) => { 
        const isUploaded = siswa.fileScanLokal.startsWith('http');
        daftarAnakHtml += `
            <div style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <span style="font-weight:600;color:#1e293b;">👤 ${siswa.namaSiswa}</span> 
                    <span style="font-size:11px; color:#475569;">(${siswa.gender}) [${siswa.keterangan}]</span>
                    <br><small style="color:#6b7280;">Link Cloud: ${isUploaded ? `<a href="${siswa.fileScanLokal}" target="_blank">📂 Buka File Gambar</a>` : '❌ Menunggu Klien'}</small>
                </div>
                <div style="display:flex;gap:10px;align-items:center;">
                    <span style="font-size:12px;font-weight:bold;">${siswa.statusFormPusat}</span>
                    ${!isUploaded ? '' : `<a href="/internal/tandai-terkirim/${order.id_order}/${siswa.idSiswa}" style="background-color:#10b981; color:white; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold;">🔗 Set GForm</a>`}
                </div>
            </div>`; 
    });

    res.send(`
        <div style="font-family:'Segoe UI',sans-serif; max-width:750px; margin:40px auto; padding:20px; border:1px solid #e5e7eb; border-radius:8px;">
            <a href="/internal/dashboard" style="text-decoration:none; color:#2563eb; font-size:14px;">← Kembali ke Dashboard</a>
            <h3>Daftar Dokumen Masuk Cloud</h3>
            <p>Lembaga Mitra: <b>${order.nama_klien}</b> [${order.id_order}]</p>
            <hr style="border:0; border-top:1px solid #e5e7eb; margin:15px 0;">
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #cbd5e1;">
                <b style="color: #1e293b; font-size: 14px; display:block; margin-bottom:3px;">📋 Tempel Excel Multi-Kolom (Tim Internal)</b>
                <form action="/portal/update-nama-massal/${order.id_order}" method="POST">
                    <input type="hidden" name="asal_halaman" value="internal">
                    <textarea name="list_nama_textarea" rows="4" placeholder="Tempel kolom Excel di sini..." required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:sans-serif; box-sizing:border-box; font-size:13px;"></textarea>
                    <button type="submit" style="margin-top:8px; background-color:#1e3a8a; color:white; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:11px;">Simpan Perubahan</button>
                </form>
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">${daftarAnakHtml}</div>
        </div>
    `);
});

// ROUTE INTERNAL PENDUKUNG (UPDATE DATA KE SUPABASE CLOUD)
app.get('/internal/tandai-terkirim/:idOrder/:idSiswa', async (req, res) => {
    const { idOrder, idSiswa } = req.params;
    const { data: order } = await supabase.from('orders').select('*').eq('id_order', idOrder).single();
    if(order) {
        let listSiswaUpdate = order.data_siswa;
        const siswa = listSiswaUpdate.find(s => s.idSiswa == idSiswa);
        if(siswa) siswa.statusFormPusat = '🔹 TERKIRIM KE PUSAT (GFORM)';
        await supabase.from('orders').update({ data_siswa: listSiswaUpdate }).eq('id_order', idOrder);
    }
    res.redirect(`/internal/lihat-siswa/${idOrder}`);
});

app.get('/internal/lunaskan/:id', async (req, res) => {
    await supabase.from('orders').update({ status_pembayaran: 'Lunas' }).eq('id_order', req.params.id);
    res.redirect('/internal/dashboard');
});

app.post('/internal/plot-tim/:id', async (req, res) => {
    await supabase.from('orders').update({
        praktisi_lapangan: req.body.praktisi_lapangan,
        praktisi_saji: req.body.praktisi_saji
    }).eq('id_order', req.params.id);
    res.redirect('/internal/dashboard');
});

// ROUTE INTERNAL PENGATURAN (SINKRONISASI SETTINGS DI SUPABASE)
app.get('/internal/pengaturan', pastikanInternal, async (req, res) => {
    const { data: resBank } = await supabase.from('settings').select('value').eq('key', 'info_rekening').single();
    const { data: resPraktisi } = await supabase.from('settings').select('value').eq('key', 'daftar_praktisi').single();
    
    const infoBank = resBank.value;
    const daftarPraktisi = resPraktisi.value;

    res.send(`
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 30px auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; background:#fff;">
            <a href="/internal/dashboard" style="text-decoration: none; color: #2563eb; font-size: 14px;">← Kembali ke Dashboard</a>
            <h3>⚙ Panel Pengaturan Kantor Cabang (Cloud)</h3>
            <hr style="border:0; border-top:1px solid #e5e7eb; margin:15px 0;">
            <form action="/internal/simpan-pengaturan" method="POST">
                <label>Nama Bank:</label><input type="text" name="bank" value="${infoBank.bank}" required style="width:100%; padding:8px; margin-bottom:10px;">
                <label>Nomor Rekening:</label><input type="text" name="nomor_rekening" value="${infoBank.nomorRekening}" required style="width:100%; padding:8px; margin-bottom:10px;">
                <label>Nama Pemilik Rekening:</label><input type="text" name="atas_nama" value="${infoBank.atasNama}" required style="width:100%; padding:8px; margin-bottom:20px;">
                
                <label>Tambah Anggota Praktisi Lapangan Baru:</label>
                <input type="text" name="praktisi_baru" placeholder="Ketik nama praktisi..." style="width:100%; padding:8px; margin-bottom:5px;">
                <small style="color:#6b7280; display:block; margin-bottom:20px;">Aktif: <i>${daftarPraktisi.join(', ')}</i></small>
                
                <button type="submit" style="width:100%; padding:12px; background:#10b981; color:#fff; border:none; font-weight:bold; cursor:pointer;">💾 Simpan ke Supabase Cloud</button>
            </form>
        </div>
    `);
});

app.post('/internal/simpan-pengaturan', pastikanInternal, async (req, res) => {
    const { bank, nomor_rekening, atas_nama, praktisi_baru } = req.body;
    
    await supabase.from('settings').update({ value: { bank, nomorRekening: nomor_rekening, atasNama: atas_nama } }).eq('key', 'info_rekening');
    
    if (praktisi_baru && praktisi_baru.trim() !== "") {
        const { data: resPraktisi } = await supabase.from('settings').select('value').eq('key', 'daftar_praktisi').single();
        let listPraktisi = resPraktisi.value;
        listPraktisi.push(praktisi_baru.trim());
        await supabase.from('settings').update({ value: listPraktisi }).eq('key', 'daftar_praktisi');
    }
    res.send(`<script>alert("Pengaturan Cloud Berhasil Di-update!"); window.location.href = "/internal/dashboard";</script>`);
});

// ROUTE AKHIR SETORAN STRUK PUSAT
app.get('/internal/upload-pusat/:id', pastikanInternal, (req, res) => { res.send(`<h3>Upload Berkas Setoran Pusat</h3><form action="/internal/proses-upload-pusat/${req.params.id}" method="POST" enctype="multipart/form-data"><input type="file" name="file_setoran" required><br><br><button type="submit">Upload Struk</button></form>`); });
app.post('/internal/proses-upload-pusat/:id', pastikanInternal, upload.single('file_setoran'), async (req, res) => {
    if(req.file) {
        const linkStrukCloud = await uploadKeSupabaseStorage(req.file, 'setoran-pusat');
        await supabase.from('orders').update({
            file_setoran_pusat_pdf: linkStrukCloud,
            status_upload_pusat: 'Terupload'
        }).eq('id_order', req.params.id);
    }
    res.redirect('/internal/dashboard');
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Terabaca Cloud Terkoneksi di http://localhost:${PORT}`);
    console.log(`==================================================`);
});