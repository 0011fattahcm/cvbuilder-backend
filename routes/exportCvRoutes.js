import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import express from 'express';
import ExcelJS from 'exceljs';
import authMiddleware from '../middleware/authMiddleware.js';
import CV from '../models/CV.js';
import axios from 'axios';
import mime from 'mime-types';
import logActivity from '../utils/logActivity.js';
import { referenceBorderMap } from './referenceBorderMap.js';

const getImageBuffer = async (imageSource) => {
  if (!imageSource) throw new Error('Foto tidak ditemukan');

  if (imageSource.startsWith('http')) {
    const res = await axios.get(imageSource, { responseType: 'arraybuffer' });
    const contentType = res.headers['content-type'];
    const extension = mime.extension(contentType);
    return { buffer: Buffer.from(res.data), extension };
  }

  if (imageSource.startsWith('data:image/')) {
    const matches = imageSource.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) throw new Error('Format base64 tidak valid');
    const extension = matches[1] === 'jpg' ? 'jpeg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    return { buffer, extension };
  }

  throw new Error('Format gambar tidak didukung (bukan URL atau base64)');
};

function setThickOutsideBorder(worksheet, startRow, endRow, startCol = 1, endCol = 5) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = worksheet.getCell(row, col);

      // Apply all sides, default to undefined if not on the edge
      cell.border = {
        top: row === startRow ? { style: 'thick', color: { argb: '000000' } } : undefined,
        bottom: row === endRow ? { style: 'thick', color: { argb: '000000' } } : undefined,
        left: col === startCol ? { style: 'thick', color: { argb: '000000' } } : undefined,
        right: col === endCol ? { style: 'thick', color: { argb: '000000' } } : undefined,
      };
    }
  }

  // 🔥 Tambahan patch khusus kolom A: Paksa border kiri semua cell kolom A
  for (let row = startRow; row <= endRow; row++) {
    const cell = worksheet.getCell(row, startCol);
    const existing = cell.border || {};
    cell.border = {
      ...existing,
      left: { style: 'thick', color: { argb: '000000' } }
    };
  }
}


function applyReferenceBorder(worksheet, referenceBorderMap) {
  const styleMap = {
    thin: { style: 'thin', color: { argb: '000000' } },
    medium: { style: 'medium', color: { argb: '000000' } },
    dotted: { style: 'dotted', color: { argb: '000000' } },
    dashed: { style: 'dashed', color: { argb: '000000' } },
    double: { style: 'double', color: { argb: '000000' } },
    hair: { style: 'hair', color: { argb: '000000' } },
  };

  for (const cellRef in referenceBorderMap) {
    const cell = worksheet.getCell(cellRef);
    const ref = referenceBorderMap[cellRef];
    const current = cell.border || {};

    cell.border = {
      top: ref.top ? styleMap[ref.top] : current.top,
      bottom: ref.bottom ? styleMap[ref.bottom] : current.bottom,
      left: ref.left ? styleMap[ref.left] : current.left,
      right: ref.right ? styleMap[ref.right] : current.right,
    };
  }
}

const router = express.Router();

router.get('/excel/:id', async (req, res) => {
  const userId = req.params.id;
  const type = req.query.type || 'excel';
  const user = await CV.findById(req.params.id); // ✅ COCOK dengan route

  if (!user) {
    return res.status(404).json({ message: 'CV tidak ditemukan' });
  }

  const riwayatJepang = user.riwayatJepang && user.riwayatJepang.length > 0 ? user.riwayatJepang[0] : {};
  const pernah = riwayatJepang.pernah || '';
  const ijinTinggal = riwayatJepang.ijinTinggal || '';
  const lamaTinggal = riwayatJepang.lamaTinggal || '';
  const perusahaanPenerima = riwayatJepang.perusahaanPenerima || '';
  const lokasi = riwayatJepang.lokasi || '';

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('CV');

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    verticalCentered: false,
    printArea: 'A1:E59',
    margins: {
      left: 0.3, right: 0.3,
      top: 0.5, bottom: 0.5,
      header: 0.2, footer: 0.2
    }
  };

  worksheet.columns = [
    { width: 5.57 },
    { width: 15.71 },
    { width: 25.29 },
    { width: 37.43 },
    { width: 23.29 },
  ];

  const rowHeights = {
    1: 27, 2: 15.75, 3: 25.5, 4: 12.75, 5: 24.75, 6: 15, 7: 15, 8: 15, 9: 30,
    10: 15, 11: 24.75, 12: 15, 13: 24, 14: 16.5, 15: 27, 16: 15, 17: 17.25,
    18: 15, 19: 17.25, 20: 13.5, 21:13.5, 22: 21.75, 23: 12.5, 24: 12.5, 25: 45.75, 26: 15,
    27: 25.5, 28:13.5, 29: 13.5, 30: 15, 31: 15, 32: 15, 33: 15, 34: 15, 35: 26.5, 36: 13.5,
    37: 13.5, 38: 15, 39: 15, 40: 15, 41: 15, 42: 15, 43: 24, 44: 13.5,
    45: 13.5, 46: 15, 47: 15, 48: 15, 49: 15, 50: 15, 51: 15, 52: 15,
    53: 24, 54: 16, 55: 16, 56: 27.75, 57: 12.5, 58: 12.5, 59: 27.75
  };

  for (const [row, height] of Object.entries(rowHeights)) {
    worksheet.getRow(Number(row)).height = height;
  }
  
  // Judul
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = '特　定　技　能　履　歴　書';
  worksheet.getCell('A1').font = { name: 'Century', size: 22, bold: true };
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = 'DAFTAR RIWAYAT HIDUP';
  worksheet.getCell('A2').font = { name: 'Century', size: 12 };
  worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

  // Data Diri Section
  worksheet.mergeCells('C5:E5');
  worksheet.getCell('C5').value = '個人情報　DATA DIRI';
  worksheet.getCell('C5').font = { name: 'Century', size: 12, bold: true };
  worksheet.getCell('C5').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('C5').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DAEEF3' }
  };

 
  // Spasi 
  worksheet.mergeCells('A3:E4');
  worksheet.mergeCells('A26:E26');
  worksheet.mergeCells('A34:E34');
  worksheet.mergeCells('A42:E42');
  worksheet.mergeCells('A52:E52');
  
  

   // 🖼️ Foto Pas Foto (A5:B11)
   try {
    const { buffer, extension } = await getImageBuffer(user.foto);
    const imageId = workbook.addImage({ buffer, extension });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 4 },
      br: { col: 2, row: 11 },
      editAs: 'oneCell',
    });
  } catch (err) {
    console.warn('⚠️ Gagal menambahkan pas foto:', err.message);
  }

  worksheet.getCell('A5').border = {
    top: { style: 'thick', color: { argb: '000000' } },
    left: { style: 'thick', color: { argb: '000000' } },
    right: { style: 'thick', color: { argb: '000000' } },
    bottom: undefined, // tidak usah disetel
  };
  
  worksheet.mergeCells('C6:D6');
  worksheet.getCell('C6').value = '名前　Nama';
  worksheet.getCell('C6').font = { name: 'Century', size: 10};
  worksheet.getCell('C6').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'EAF3F8' }
  };

  worksheet.getCell('E6').value = 'ニックネーム　Panggilan';
  worksheet.getCell('E6').font = { name: 'Century', size: 10};
  worksheet.getCell('E6').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'EAF3F8' }
  };

  worksheet.mergeCells('C8:D9');
  worksheet.getCell('C8').font = { name: 'Century', size: 22};
  worksheet.getCell('C8').value = user.nama;
  worksheet.getCell('C8').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('C7:D7');
  worksheet.getCell('C7').font = { name: 'Century', size: 10};
  worksheet.getCell('C7').value = user.namaKatakana;
  worksheet.getCell('C7').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('E7').value = user.panggilanKatakana;
  worksheet.getCell('E7').font = { name: 'Century', size: 10};
  worksheet.getCell('E7').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('E8:E9');
  worksheet.getCell('E8').font = { name: 'Century', size: 22};
  worksheet.getCell('E8').value = user.panggilan;
  worksheet.getCell('E8').alignment = { vertical: 'middle', horizontal: 'center' };

  
  // Tanggal Lahir - Usia
  worksheet.mergeCells('C10:D10');
  worksheet.getCell('C10').value = '生年月日　Tanggal Lahir';
  worksheet.getCell('C10').font = { name: 'Century', size: 10};
  worksheet.getCell('C10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.mergeCells('C11:D11');

  worksheet.getCell('C11').font = { name: 'Century', size: 12};
  const tanggalLahir = new Date(user.tanggalLahir);
  const tahun = tanggalLahir.getFullYear();
  const bulan = String(tanggalLahir.getMonth() + 1).padStart(2, '0');
  const tanggal = String(tanggalLahir.getDate()).padStart(2, '0');
  worksheet.getCell('C11').value = `${tahun}年${bulan}月${tanggal}日`;
  worksheet.getCell('C11').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('E10').value = '年齢　Usia';
  worksheet.getCell('E10').font = { name: 'Century', size: 10};
  worksheet.getCell('E10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };

  worksheet.getCell('E11').font = { name: 'Century', size: 12};
  worksheet.getCell('E11').value = `${user.usia}歳`;
  worksheet.getCell('E11').alignment = { vertical: 'middle', horizontal: 'center' };


  // Jenis kelamin - Tempat lahir - Email - Telp
  worksheet.mergeCells('A12:B12');
  worksheet.getCell('A12').value = '性別　Jenis Kelamin';
  worksheet.getCell('A12').font = { name: 'Century', size: 10};
  worksheet.getCell('A12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };

  worksheet.mergeCells('A13:B13');
// Mapping jenis kelamin
let jenisKelaminFormatted = '';
if (user.jenisKelamin.toLowerCase() === '男') {
  jenisKelaminFormatted = '男 Laki-Laki';
} else if (user.jenisKelamin.toLowerCase() === '女') {
  jenisKelaminFormatted = '女 Perempuan';
} else {
  jenisKelaminFormatted = user.jenisKelamin;
}
worksheet.getCell('A13').value = jenisKelaminFormatted;
worksheet.getCell('A13').alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
worksheet.getCell('A13').font = { name: 'Century', size: 10 };

  worksheet.getCell('A13').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('C12').value = '出身地　Tempat Lahir';
  worksheet.getCell('C12').font = { name: 'Century', size: 10};
  worksheet.getCell('C12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };

  worksheet.getCell('C13').font = { name: 'Century', size: 10};
  worksheet.getCell('C13').value = user.tempatLahir;
  worksheet.getCell('C13').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('D12').value = 'メールアドレス　Email Aktif';
  worksheet.getCell('D12').font = { name: 'Century', size: 10};
  worksheet.getCell('D12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D12').alignment = { vertical: 'middle' };

  worksheet.getCell('D13').font = { name: 'Century', size: 10};
  worksheet.getCell('D13').value = user.email;
  worksheet.getCell('D13').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('E12').value = '連絡先　Telp. Peserta';
  worksheet.getCell('E12').font = { name: 'Century', size: 10};
  worksheet.getCell('E12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };

  worksheet.getCell('E13').value = user.telp;
  worksheet.getCell('E13').font = { name: 'Century', size: 10};
  worksheet.getCell('E13').alignment = { vertical: 'middle', horizontal: 'center' };

  // Alamat Lengkap
  worksheet.mergeCells('A14:E14');
  worksheet.getCell('A14').value = '現住所 Alamat Lengkap';
  worksheet.getCell('A14').font = { name: 'Century', size: 10};
  worksheet.getCell('A14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A14').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A15:E15');
  worksheet.getCell('A15').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A15').font = { name: 'Century', size: 10};
  worksheet.getCell('A15').value = user.alamatLengkap;

  // Tinggi - Berat - Status - Agama
  worksheet.mergeCells('A16:B16');
  worksheet.getCell('A16').value = '身長 Tinggi Badan';
  worksheet.getCell('A16').font = { name: 'Century', size: 10};
  worksheet.getCell('A16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };

  worksheet.mergeCells('A17:B17');
  worksheet.getCell('A17').value = user.tinggiBadan;
  worksheet.getCell('A17').font = { name: 'Century', size: 10};
  worksheet.getCell('A17').alignment = { vertical: 'middle', horizontal: 'center' };


  worksheet.getCell('C16').value = '体重 Berat Badan';
  worksheet.getCell('C16').font = { name: 'Century', size: 10};
  worksheet.getCell('C16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };

  worksheet.getCell('C17').value = user.beratBadan;
  worksheet.getCell('C17').font = { name: 'Century', size: 10};
  worksheet.getCell('C17').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('D16').value = '配偶者 Status Pernikahan';
  worksheet.getCell('D16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };
  worksheet.getCell('D16').font = { name: 'Century', size: 10};

  let statusNikah = user.statusPernikahan;
  if (statusNikah === '無') statusNikah = '無 Belum Menikah';
  else if (statusNikah === '有') statusNikah = '有 Sudah Menikah';
  else if (statusNikah === '離婚') statusNikah = '離婚 Cerai';
  worksheet.getCell('D17').value = statusNikah;
  worksheet.getCell('D17').font = { name: 'Century', size: 10};
  worksheet.getCell('D17').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('E16').value = '宗教 Agama';
  worksheet.getCell('E16').font = { name: 'Century', size: 10};
  worksheet.getCell('E16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };

  worksheet.getCell('E17').value = user.agama;
  worksheet.getCell('E17').font = { name: 'Century', size: 10};
  worksheet.getCell('E17').alignment = { vertical: 'middle', horizontal: 'center' };

  // Golongan Darah - Alkohol - Merokok - Buta Warna
  worksheet.mergeCells('A18:B18');
  worksheet.getCell('A18').value = '血液型 Golongan Darah';
  worksheet.getCell('A18').font = { name: 'Century', size: 10};
  worksheet.getCell('A18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };

  worksheet.mergeCells('A19:B19');
  worksheet.getCell('A19').value = user.golonganDarah;
  worksheet.getCell('A19').font = { name: 'Century', size: 10};
  worksheet.getCell('A19').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('C18').value = '飲酒 Alkohol';
  worksheet.getCell('C18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('C18').font = { name: 'Century', size: 10};

  const alkoholMap = {
    'いいえ': 'いいえ Tidak',
    'はい': 'はい Ya'
  };
  const alkohol = user.alkohol;
  worksheet.getCell('C19').value = alkoholMap[alkohol] || alkohol;
  worksheet.getCell('C19').font = { name: 'Century', size: 10};
  worksheet.getCell('C19').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('D18').value = 'タバコ　Merokok';
  worksheet.getCell('D18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D18').font = { name: 'Century', size: 10};

  const merokokMap = {
    'いいえ': 'いいえ Tidak',
    'はい': 'はい Ya'
  };
  const merokok = user.merokok;
  worksheet.getCell('D19').value = merokokMap[merokok] || merokok;
  worksheet.getCell('D19').font = { name: 'Century', size: 10};
  worksheet.getCell('D19').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.getCell('E18').value = '色覚異常 Buta Warna';
  worksheet.getCell('E18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E18').font = { name: 'Century', size: 10};

  const butaWarnaMap = {
    'いいえ': 'いいえ Tidak',
    'はい': 'はい Ya'
  };
  const butaWarna = user.butaWarna;
  worksheet.getCell('E19').value = butaWarnaMap[butaWarna] || butaWarna;
  worksheet.getCell('E19').font = { name: 'Century', size: 10};
  worksheet.getCell('E19').alignment = { vertical: 'middle', horizontal: 'center' };


  // Bahasa - SSW - Pasport - Masa Berlaku

  //HEADER LEVEL BAHASA
  worksheet.mergeCells('A20:B20');
  worksheet.mergeCells('A21:B21');
  worksheet.getCell('A20').value = '日本語能力';
  worksheet.getCell('A21').value = 'Level Bahasa';
  worksheet.getCell('A20').font = { name: 'Century', size: 10};
  worksheet.getCell('A20').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A21').font = { name: 'Century', size: 10};
  worksheet.getCell('A21').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A21').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } }

  //ISI CELL
  worksheet.mergeCells('A22:B22');
  worksheet.getCell('A22').value = user.levelBahasa;
  worksheet.getCell('A22').font = { name: 'Century', size: 10};
  worksheet.getCell('A22').alignment = { vertical: 'middle', horizontal: 'center' };

  //HEADER SSW
  worksheet.getCell('C20').value = '技能評価試験合格証明書';
  worksheet.getCell('C21').value = 'SSW yang dimiliki';

  worksheet.getCell('C20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('C20').font = { name: 'Century', size: 10};
  worksheet.getCell('C20').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('C21').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('C21').font = { name: 'Century', size: 10};
  worksheet.getCell('C21').alignment = { vertical: 'middle', horizontal: 'center' };

  //ISI CELL SSW
  worksheet.getCell('C22').value = user.sswDimiliki;
  worksheet.getCell('C22').font = { name: 'Century', size: 10};
  worksheet.getCell('C22').alignment = { vertical: 'middle', horizontal: 'center' };


  //HEADER NOMOR PASSPORT
  worksheet.getCell('D20').value = 'パスポート番号';
  worksheet.getCell('D21').value = 'Nomor Pasport';

  worksheet.getCell('D20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D20').font = { name: 'Century', size: 10};
  worksheet.getCell('D20').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('D21').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D21').font = { name: 'Century', size: 10};
  worksheet.getCell('D21').alignment = { vertical: 'middle', horizontal: 'center' };

  //ISI CELL NOMOR PASSPORT
  worksheet.getCell('D22').value = user.nomorPaspor;
  worksheet.getCell('D22').font = { name: 'Century', size: 10};
  worksheet.getCell('D22').alignment = { vertical: 'middle', horizontal: 'center' };

  //HEADER MASA BERLAKU
  worksheet.getCell('E20').value = '有効期限';
  worksheet.getCell('E21').value = 'Masa Berlaku';
  worksheet.getCell('E20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E20').font = { name: 'Century', size: 10};
  worksheet.getCell('E20').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('E21').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E21').font = { name: 'Century', size: 10};
  worksheet.getCell('E21').alignment = { vertical: 'middle', horizontal: 'center' };

  //ISI CELL MASA BERLAKU
  worksheet.getCell('E22').value = user.masaBerlakuPaspor;
  worksheet.getCell('E22').font = { name: 'Century', size: 10};
  worksheet.getCell('E22').alignment = { vertical: 'middle', horizontal: 'center' };

  // Header Promosi Diri
  worksheet.mergeCells('A23:E23');
  worksheet.mergeCells('A24:E24');
  worksheet.getCell('A23').value = '自己PR';
  worksheet.getCell('A24').value = 'Promosi Diri';
  worksheet.getCell('A23').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A23').font = { name: 'Century', size: 10};
  worksheet.getCell('A23').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A24').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A24').font = { name: 'Century', size: 10};
  worksheet.getCell('A24').alignment = { vertical: 'middle', horizontal: 'center' };

  //Isi Cell Promosi Diri
  worksheet.mergeCells('A25:E25');
  worksheet.getCell('A25').value = user.promosiDiri;
  worksheet.getCell('A25').font = { name: 'Century', size: 10};
  worksheet.getCell('A25').alignment = { vertical: 'middle', horizontal: 'center' };

  // Pendidikan Section
  worksheet.mergeCells('A27:E27');
  worksheet.getCell('A27').value = '学歴 Pendidikan';
  worksheet.getCell('A27').font = { name: 'Century', size: 12, bold: true };
  worksheet.getCell('A27').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A27').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };

  //Header Nama Sekolah
  worksheet.mergeCells('A28:C28');
  worksheet.mergeCells('A29:C29');
  worksheet.getCell('A28').value = '学校名';
  worksheet.getCell('A29').value = 'Nama Sekolah';
  worksheet.getCell('A28').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A28').font = { name: 'Century', size: 10};
  worksheet.getCell('A28').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A29').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A29').font = { name: 'Century', size: 10};
  worksheet.getCell('A29').alignment = { vertical: 'middle', horizontal: 'center' };

  //Header Jurusan
  worksheet.getCell('D28').value = '専門';
  worksheet.getCell('D29').value = 'Jurusan'; 
  worksheet.getCell('D28').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D28').font = { name: 'Century', size: 10};
  worksheet.getCell('D28').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('D29').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D29').font = { name: 'Century', size: 10};
  worksheet.getCell('D29').alignment = { vertical: 'middle', horizontal: 'center' };
  
  //Header Masa
  worksheet.getCell('E28').value = '期間';
  worksheet.getCell('E29').value = 'Masa';
  worksheet.getCell('E28').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E28').font = { name: 'Century', size: 9};
  worksheet.getCell('E28').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('E29').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E29').font = { name: 'Century', size: 9};
  worksheet.getCell('E29').alignment = { vertical: 'middle', horizontal: 'center' };

  const kanjiJenjang = ['（小）', '（中）', '（高）', '（大）'];

  user.pendidikan.forEach((item, index) => {
    const row = 30 + index;
    const jenjang = kanjiJenjang[index] || '';
  
    worksheet.mergeCells(`A${row}:C${row}`);
    worksheet.getCell(`A${row}`).value = `${jenjang} ${item.nama}`;
    worksheet.getCell(`A${row}`).font = { name: 'Century', size: 10 };
    worksheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left' };
  
    worksheet.getCell(`D${row}`).value = item.jurusan;
    worksheet.getCell(`D${row}`).font = { name: 'Century', size: 10 };
    worksheet.getCell(`D${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
  
    worksheet.getCell(`E${row}`).value = item.masa;
    worksheet.getCell(`E${row}`).font = { name: 'Century', size: 9 };
    worksheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
  });
  
  // Pekerjaan Section
  worksheet.mergeCells('A35:E35');
  worksheet.getCell('A35').value = '職歴 Latar Belakang Pekerjaan';
  worksheet.getCell('A35').font = { name: 'Century', size: 12, bold: true };
  worksheet.getCell('A35').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A35').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };

  //Header nama perusahaan
  worksheet.mergeCells('A36:C36');
  worksheet.mergeCells('A37:C37');
  worksheet.getCell('A36').value = '会社名';
  worksheet.getCell('A37').value = 'Nama Perusahaan';
  worksheet.getCell('A36').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A36').font = { name: 'Century', size: 10};
  worksheet.getCell('A36').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A37').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A37').font = { name: 'Century', size: 10};
  worksheet.getCell('A37').alignment = { vertical: 'middle', horizontal: 'center' };

  //Header Rincian Kerja
  worksheet.getCell('D36').value = '仕事内容';
  worksheet.getCell('D37').value = 'Rincian Kerja';
  worksheet.getCell('D36').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D36').font = { name: 'Century', size: 10};
  worksheet.getCell('D36').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('D37').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D37').font = { name: 'Century', size: 10};
  worksheet.getCell('D37').alignment = { vertical: 'middle', horizontal: 'center' };

  //Header Masa Kerja
  worksheet.getCell('E36').value = '期間';
  worksheet.getCell('E37').value = 'Masa Kerja'; 
  worksheet.getCell('E36').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E36').font = { name: 'Century', size: 10};
  worksheet.getCell('E36').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('E37').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E37').font = { name: 'Century', size: 10};
  worksheet.getCell('E37').alignment = { vertical: 'middle', horizontal: 'center' };

  user.pekerjaan.forEach((job, index) => {
    const row = 38 + index;
    worksheet.mergeCells(`A${row}:C${row}`);
    worksheet.getCell(`A${row}`).value = job.namaPerusahaan;
    worksheet.getCell(`A${row}`).font = { name: 'Century', size: 10};
    worksheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.getCell(`D${row}`).value = job.rincianKerja;
    worksheet.getCell(`D${row}`).font = { name: 'Century', size: 10};
    worksheet.getCell(`D${row}`).alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.getCell(`E${row}`).value = job.masaKerja;
    worksheet.getCell(`E${row}`).font = { name: 'Century', size: 9};
    worksheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
  });

  // Susunan Keluarga Section
  worksheet.mergeCells('A43:E43');
  worksheet.getCell('A43').value = '家族構成 Susunan Keluarga';
  worksheet.getCell('A43').font = { name: 'Century', size: 12, bold: true };
  worksheet.getCell('A43').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A43').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };

  //Header urutan keluarga
  worksheet.mergeCells('A44:B44');
  worksheet.mergeCells('A45:B45');
  worksheet.getCell('A44').value = '家族順番';
  worksheet.getCell('A45').value = 'Urutan Keluarga';
  worksheet.getCell('A44').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A44').font = { name: 'Century', size: 10};
  worksheet.getCell('A44').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A45').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A45').font = { name: 'Century', size: 10};
  worksheet.getCell('A45').alignment = { vertical: 'middle', horizontal: 'center' };

  //header nama anggota keluarga
  worksheet.getCell('C44').value = '家族の名前';
  worksheet.getCell('C45').value = 'Nama Anggota Keluarga';
  worksheet.getCell('C44').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('C44').font = { name: 'Century', size: 10};
  worksheet.getCell('C44').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('C45').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('C45').font = { name: 'Century', size: 10};
  worksheet.getCell('C45').alignment = { vertical: 'middle', horizontal: 'center' };

  //Header Pekerjaan
  worksheet.getCell('D44').value = '職業';
  worksheet.getCell('D45').value = 'Pekerjaan';
  worksheet.getCell('D44').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D44').font = { name: 'Century', size: 10};
  worksheet.getCell('D44').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('D45').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D45').font = { name: 'Century', size: 10};
  worksheet.getCell('D45').alignment = { vertical: 'middle', horizontal: 'center' };

  //Header Usia
  worksheet.getCell('E44').value = '年齢';
  worksheet.getCell('E45').value = 'Usia';
  worksheet.getCell('E44').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E44').font = { name: 'Century', size: 10};
  worksheet.getCell('E44').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('E45').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E45').font = { name: 'Century', size: 10};
  worksheet.getCell('E45').alignment = { vertical: 'middle', horizontal: 'center' };

  //Keluarga Section
  worksheet.mergeCells('A46:B46');
  worksheet.mergeCells('A47:B47');
  worksheet.mergeCells('A48:B48');
  worksheet.mergeCells('A49:B49');
  worksheet.mergeCells('A50:B50');
  worksheet.mergeCells('A51:B51');

  user.keluarga.forEach((kel, index) => {
    const row = 46 + index; // <-- FIXED: mendefinisikan variabel row
  
    const urutanMap = {
      '父': 'Ayah 父',
      '母': 'Ibu 母',
      '兄': 'Kakak Laki-laki 兄',
      '姉': 'Kakak Perempuan 姉',
      '弟': 'Adik Laki-laki 弟',
      '妹': 'Adik Perempuan 妹',
      '子供': 'Anak 子供',
      '夫': 'Suami 夫',
      '妻': 'Istri 妻',
    };
  
    const urutanValue = urutanMap[kel.urutan] || kel.urutan;
  
    worksheet.getCell(`A${row}`).value = urutanValue;
    worksheet.getCell(`A${row}`).font = { name: 'Century', size: 10 };
    worksheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
  
    worksheet.getCell(`C${row}`).value = kel.nama;
    worksheet.getCell(`C${row}`).font = { name: 'Century', size: 10 };
    worksheet.getCell(`C${row}`).alignment = { vertical: 'middle' };
  
    worksheet.getCell(`D${row}`).value = kel.pekerjaan;
    worksheet.getCell(`D${row}`).font = { name: 'Century', size: 10 };
    worksheet.getCell(`D${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
  
    worksheet.getCell(`E${row}`).value = `${kel.usia}歳`;
    worksheet.getCell(`E${row}`).font = { name: 'Century', size: 10 };
    worksheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
  });
  

// Riwayat ke Jepang
  worksheet.mergeCells('A53:E53');
  worksheet.getCell('A53').value = '訪日経験　Riwayat datang ke Jepang';
  worksheet.getCell('A53').font = { name: 'Century', size: 12, bold: true };
  worksheet.getCell('A53').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } };
  worksheet.getCell('A53').alignment = { vertical: 'middle', horizontal: 'center' };

  //HEADER PERNAH
  worksheet.mergeCells('A54:B54');
  worksheet.mergeCells('A55:B55');
  worksheet.getCell('A54').value = '訪日経験';
  worksheet.getCell('A55').value = 'Riwayat datang ke Jepang';
  worksheet.getCell('A54').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A54').font = { name: 'Century', size: 8};
  worksheet.getCell('A54').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A55').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('A55').font = { name: 'Century', size: 8};
  worksheet.getCell('A55').alignment = { vertical: 'middle', horizontal: 'center' };

  //HEADER IJIN TINGGAL
  worksheet.getCell('C54').value = '在留資格';
  worksheet.getCell('C55').value = 'Ijin Tinggal';
  worksheet.getCell('C54').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('C54').font = { name: 'Century', size: 8};
  worksheet.getCell('C54').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('C55').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('C55').font = { name: 'Century', size: 8};
  worksheet.getCell('C55').alignment = { vertical: 'middle', horizontal: 'center' };

  //Header lama TInggal
  worksheet.getCell('D54').value = '在留期間';
  worksheet.getCell('D55').value = 'Lama Tinggal';
  worksheet.getCell('D54').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D54').font = { name: 'Century', size: 8};
  worksheet.getCell('D54').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('D55').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D55').font = { name: 'Century', size: 8};
  worksheet.getCell('D55').alignment = { vertical: 'middle', horizontal: 'center' };

  //header nama perusahaan
  worksheet.getCell('D57').value = '機関名';
  worksheet.getCell('D58').value = 'Nama Perusahaan Penerima';
  worksheet.getCell('D57').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D57').font = { name: 'Century', size: 8};
  worksheet.getCell('D57').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('D58').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('D58').font = { name: 'Century', size: 8};
  worksheet.getCell('D58').alignment = { vertical: 'middle', horizontal: 'center' };

  //header prefektur
  worksheet.getCell('E54').value = '住所';
  worksheet.getCell('E55').value = 'Prefektur・Kota';
  worksheet.getCell('E54').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E54').font = { name: 'Century', size: 8};
  worksheet.getCell('E54').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('E55').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF3F8' } };
  worksheet.getCell('E55').font = { name: 'Century', size: 8};
  worksheet.getCell('E55').alignment = { vertical: 'middle', horizontal: 'center' };


  worksheet.mergeCells('A56:B59');
  const pernahMap = {
    '有': '有 Pernah',
    '無': '無 Belum Pernah'
  };
  worksheet.getCell('A56').value = pernahMap[pernah] || pernah;
  worksheet.getCell('A56').font = { name: 'Century', size: 10};
  worksheet.getCell('A56').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('C56:C59');
  worksheet.getCell('C56').value = ijinTinggal;
  worksheet.getCell('C56').font = { name: 'Century', size: 10};
  worksheet.getCell('C56').alignment = { vertical: 'middle', horizontal: 'center' };


  worksheet.getCell('D56').value = lamaTinggal;
  worksheet.getCell('D56').font = { name: 'Century', size: 9};
  worksheet.getCell('D56').alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('D59:D59');
  worksheet.getCell('D59').value = perusahaanPenerima;
  worksheet.getCell('D59').font = { name: 'Century', size: 10};
  worksheet.getCell('D59').alignment = { vertical: 'middle', horizontal: 'center' };


  worksheet.mergeCells('E56:E59');
  worksheet.getCell('E56').value = lokasi;
  worksheet.getCell('E56').font = { name: 'Century', size: 10};
  worksheet.getCell('E56').alignment = { vertical: 'middle', horizontal: 'center' };

  setThickOutsideBorder(worksheet, 5, 25);
  setThickOutsideBorder(worksheet, 27, 33);
  setThickOutsideBorder(worksheet, 35, 41);
  setThickOutsideBorder(worksheet, 43, 51);
  setThickOutsideBorder(worksheet, 53, 59);

  applyReferenceBorder(worksheet, referenceBorderMap);

  const filename = `CV_${user.nama ? user.nama.replace(/\s+/g, '_') : 'Unknown'}.xlsx`;
  const exportsDir = './exports';
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir);
  
  const excelPath = path.resolve(exportsDir, filename);
  await workbook.xlsx.writeFile(excelPath); // pastikan selesai nulis file
  
  if (type === 'pdf') {
    const pdfPath = excelPath.replace('.xlsx', '.pdf');
    const command = `libreoffice --headless --convert-to pdf --outdir "${exportsDir}" "${excelPath}"`;
  
    exec(command, async (error) => {
      if (error) {
        console.error('❌ Gagal convert PDF:', error);
        return res.status(500).send('Gagal konversi ke PDF');
      }
  
      // ✅ Tunggu file bener-bener ada
      const waitForFile = (filepath, timeout = 5000) =>
        new Promise((resolve, reject) => {
          const start = Date.now();
          const interval = setInterval(() => {
            if (fs.existsSync(filepath)) {
              clearInterval(interval);
              return resolve();
            }
            if (Date.now() - start > timeout) {
              clearInterval(interval);
              return reject(new Error("Timeout menunggu file PDF"));
            }
          }, 300);
        });
  
      try {
        await waitForFile(pdfPath);
        await CV.findByIdAndUpdate(req.params.id, {
          isExcelExported: true,
          lastExportExcel: new Date(),
          isPdfExported: true,
          lastExportPdf: new Date()
        });
        await logActivity('Export CV Excel', user.email);
        await logActivity('Export CV PDF', user.email);
  
        return res.download(pdfPath, path.basename(pdfPath));
      } catch (err) {
        console.error('❌ File PDF tidak ditemukan:', err);
        return res.status(500).send('Gagal membaca file PDF');
      }
    });
  
  } else {
    await CV.findByIdAndUpdate(req.params.id, {
      isExcelExported: true,
      lastExportExcel: new Date()
    });
    await logActivity('Export CV Excel', user.email);
  
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }  
  
});
router.get('/excel-user', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const userCv = await CV.findOne({ user: userId });
  if (!userCv) return res.status(404).json({ message: 'CV tidak ditemukan' });
  return res.redirect(`/api/export/excel/${userCv._id}?type=pdf`);
});

router.post('/pdf', authMiddleware, async (req, res) => {
  return res.redirect(`/api/export/excel-user`);
});

export default router;