/**
 * End-to-End Encryption Service using Web Crypto API
 */

export const CryptoService = {
    // In a real app, these keys would be derived from a password or exchanged using Kyber
    _key: null as CryptoKey | null,

    async init() {
        if (this._key) return;
        
        // Generate a simple key for demo purposes
        const rawKey = new TextEncoder().encode('enterprise-secure-key-32-chars!!');
        this._key = await crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    },

    async encrypt(text: string): Promise<string> {
        await this.init();
        if (!this._key) throw new Error('Key not initialized');

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);
        
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this._key,
            encoded
        );

        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return btoa(String.fromCharCode(...Array.from(combined)));
    },

    async decrypt(base64Data: string): Promise<string> {
        await this.init();
        if (!this._key) throw new Error('Key not initialized');

        const combined = new Uint8Array(
            atob(base64Data)
                .split('')
                .map(c => c.charCodeAt(0))
        );
        
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                this._key,
                ciphertext
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.error('Decryption failed', e);
            return '[Decryption Error: Key mismatch or corrupted data]';
        }
    },

    async kyberKeyExchange() {
        console.log('Kyber key exchange would happen here in a post-quantum version.');
    }
};
