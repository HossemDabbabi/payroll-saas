process.env.MAX_FILE_SIZE = '1024'; // 1 KB, lazem 9bal el require

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const { upload } = require('../src/middleware/upload.middleware');
const { notFound, errorHandler } = require('../src/middleware/error.middleware');

const app = express();
app.post('/up', upload.single('file'), (req, res) =>
  res.status(201).json({ path: req.file.path })
);
app.use(notFound);
app.use(errorHandler);

const created = [];
afterEach(() => {
  created.splice(0).forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
});

const send = async (buf, filename, contentType) => {
  const res = await request(app).post('/up').attach('file', buf, { filename, contentType });
  if (res.body.path) created.push(res.body.path);
  return res;
};

describe('upload.middleware - types de fichier', () => {
  test('.csv valide accepte', async () => {
    const res = await send(Buffer.from('Matricule,Nom\n1,Ali'), 'paie.csv', 'text/csv');
    expect(res.status).toBe(201);
  });

  test('.xlsx avec mimetype generique accepte (par extension)', async () => {
    const res = await send(Buffer.from('x'), 'paie.xlsx', 'application/octet-stream');
    expect(res.status).toBe(201);
  });

  test('.pdf refuse avec une erreur client (4xx)', async () => {
    const res = await send(Buffer.from('%PDF-1.4'), 'doc.pdf', 'application/pdf');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500); // BUG attendu: 500
  });

  test('.exe refuse', async () => {
    const res = await send(Buffer.from('MZ'), 'virus.exe', 'application/octet-stream');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  // BUG attendu: filtre mimetype OR extension
  test('.pdf avec mimetype spoofe text/csv refuse', async () => {
    const res = await send(Buffer.from('%PDF-1.4'), 'doc.pdf', 'text/csv');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('upload.middleware - taille (boundary)', () => {
  test('fichier sous la limite accepte', async () => {
    const res = await send(Buffer.alloc(1000, 'a'), 'ok.csv', 'text/csv');
    expect(res.status).toBe(201);
  });

  // BUG attendu: MulterError sans status -> 500
  test('fichier au-dessus de la limite -> erreur client 4xx (413 ideal)', async () => {
    const res = await send(Buffer.alloc(2048, 'a'), 'gros.csv', 'text/csv');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('error.middleware', () => {
  let errSpy;
  const OLD_ENV = process.env.NODE_ENV;
  beforeEach(() => { errSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errSpy.mockRestore(); process.env.NODE_ENV = OLD_ENV; });

  const run = (err) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    errorHandler(err, {}, res, jest.fn());
    return { res, body: res.json.mock.calls[0][0] };
  };

  test('ValidationError mongoose -> 400', () => {
    const { res, body } = run({ name: 'ValidationError', errors: { a: { message: 'A requis' }, b: { message: 'B requis' } } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body.message).toBe('A requis, B requis');
  });

  test('duplicate key 11000 -> 409', () => {
    const { res, body } = run({ code: 11000, keyValue: { email: 'a@a.com' }, message: 'dup' });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(body.message).toBe('Email already exists.');
  });

  test('JsonWebTokenError -> 401', () => {
    const { res } = run({ name: 'JsonWebTokenError', message: 'jwt malformed' });
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('production: pas de stack dans la reponse', () => {
    process.env.NODE_ENV = 'production';
    const { body } = run(new Error('x'));
    expect(body.stack).toBeUndefined();
  });

  // BUG attendu: stack expose hors production
  test('hors production (test): la reponse ne contient pas de stack', () => {
    process.env.NODE_ENV = 'test';
    const { body } = run(new Error('x'));
    expect(body.stack).toBeUndefined();
  });

  // BUG attendu: message interne renvoye en 500
  test('production: erreur 500 ne revele pas le message interne', () => {
    process.env.NODE_ENV = 'production';
    const { body } = run(new Error('raw is not defined'));
    expect(body.message).not.toContain('raw is not defined');
  });
});