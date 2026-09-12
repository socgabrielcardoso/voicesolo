import { SkillRequestSignatureVerifier } from 'ask-sdk-express-adapter';

export class AmazonVerifier extends SkillRequestSignatureVerifier {
  async verify(body, headers) {
    const rawUrl = headers.signaturecertchainurl;
    if (typeof rawUrl !== 'string' || rawUrl.length > 2048 || typeof headers['signature-256'] !== 'string') throw new Error('Missing signature');
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.hostname !== 's3.amazonaws.com' || (url.port && url.port !== '443') || url.username || url.password || url.search || url.hash || !url.pathname.startsWith('/echo.api/')) throw new Error('Invalid certificate URL');
    if (this.certCache.size > 32) this.certCache.clear();
    await super.verify(body, headers);
    // Check validity again on cache hits; the upstream verifier caches certificates.
    this._validateCertChain(this.certCache.get(rawUrl));
  }
  async _getCertChainByUrl(url) {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(1500) });
    if (!response.ok) throw new Error('Certificate unavailable');
    const text = await response.text();
    if (text.length > 100000) throw new Error('Certificate too large');
    return text;
  }
}
