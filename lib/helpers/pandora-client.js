'use strict';
import crypto from 'node:crypto';

/**
 * Lightweight Pandora API client using native fetch.
 * Replaces the deprecated 'anesidora' package (which depended on 'request').
 */

const ENDPOINT_SECURE = 'https://tuner.pandora.com/services/json/';
const ENDPOINT_INSECURE = 'http://tuner.pandora.com/services/json/';
const PADDING_LENGTH = 16;

const PARTNER_INFO = {
  username: 'android',
  password: 'AC7IBG09A3DTSYM4R41UJWL07VLN8JI7',
  deviceModel: 'android-generic',
  version: '5',
  decryptPassword: 'R=U!LH$O2B#',
  encryptPassword: '6#26FRL$ZWD'
};

function blowfishEncrypt(key, data) {
  const keyBuf = Buffer.from(key);
  const iv = Buffer.alloc(0);
  const padLength = PADDING_LENGTH - (data.length % PADDING_LENGTH);
  const padded = padLength === PADDING_LENGTH ? data : data + '\0'.repeat(padLength);
  const cipher = crypto.createCipheriv('bf-ecb', keyBuf, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded, 'utf8'), cipher.final()]);
}

function blowfishDecrypt(key, hexData) {
  const keyBuf = Buffer.from(key);
  const iv = Buffer.alloc(0);
  const decipher = crypto.createDecipheriv('bf-ecb', keyBuf, iv);
  decipher.setAutoPadding(false);
  return Buffer.concat([decipher.update(Buffer.from(hexData, 'hex')), decipher.final()]);
}

function seconds() {
  return Math.floor(Date.now() / 1000);
}

export default class PandoraClient {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.authData = null;
  }

  async login() {
    // Step 1: Partner login
    const partnerBody = JSON.stringify({
      username: PARTNER_INFO.username,
      password: PARTNER_INFO.password,
      deviceModel: PARTNER_INFO.deviceModel,
      version: PARTNER_INFO.version
    });

    const partnerRes = await fetch(ENDPOINT_SECURE + '?method=auth.partnerLogin', {
      method: 'POST',
      body: partnerBody
    });
    const partnerData = await partnerRes.json();
    if (partnerData.stat !== 'ok') {
      throw new Error(`Partner login failed: ${partnerData.message || 'unknown error'}`);
    }

    const partner = partnerData.result;
    const syncTimeOffset = parseInt(
      blowfishDecrypt(PARTNER_INFO.decryptPassword, partner.syncTime).toString('utf8', 4, 14),
      10
    ) - seconds();

    // Step 2: User login
    const userBody = blowfishEncrypt(PARTNER_INFO.encryptPassword, JSON.stringify({
      loginType: 'user',
      username: this.username,
      password: this.password,
      partnerAuthToken: partner.partnerAuthToken,
      syncTime: syncTimeOffset + seconds()
    })).toString('hex').toLowerCase();

    const params = new URLSearchParams({
      method: 'auth.userLogin',
      auth_token: partner.partnerAuthToken,
      partner_id: partner.partnerId
    });

    const userRes = await fetch(`${ENDPOINT_SECURE}?${params}`, {
      method: 'POST',
      body: userBody
    });
    const userData = await userRes.json();
    if (userData.stat !== 'ok') {
      throw new Error(`User login failed: ${userData.message || 'unknown error'}`);
    }

    this.authData = {
      userAuthToken: userData.result.userAuthToken,
      partnerId: partner.partnerId,
      userId: userData.result.userId,
      syncTimeOffset
    };
  }

  async request(method, data = {}) {
    if (!this.authData) {
      throw new Error('Not authenticated with Pandora (call login() before request())');
    }

    const secure = method === 'station.getPlaylist';
    const endpoint = secure ? ENDPOINT_SECURE : ENDPOINT_INSECURE;

    const body = {
      ...data,
      userAuthToken: this.authData.userAuthToken,
      syncTime: this.authData.syncTimeOffset + seconds()
    };

    const encryptedBody = blowfishEncrypt(
      PARTNER_INFO.encryptPassword,
      JSON.stringify(body)
    ).toString('hex').toLowerCase();

    const params = new URLSearchParams({
      method,
      auth_token: this.authData.userAuthToken,
      partner_id: this.authData.partnerId,
      user_id: this.authData.userId
    });

    const res = await fetch(`${endpoint}?${params}`, {
      method: 'POST',
      body: encryptedBody
    });
    const result = await res.json();

    if (result.stat === 'fail') {
      throw new Error(`${result.message || 'Unknown error'} [${result.code}]`);
    }
    return result.result;
  }
}
