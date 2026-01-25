// Type declarations for browser APIs used by ox library
// These are not available in Node.js but are used by the library

declare global {
  var window: any;
  
  type BufferSource = ArrayBufferView | ArrayBuffer;
  
  interface AuthenticatorAttestationResponse {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
    getAuthenticatorData(): ArrayBuffer;
    getPublicKey(): ArrayBuffer | null;
    getPublicKeyAlgorithm(): number | null;
  }
  
  interface AuthenticatorAssertionResponse {
    clientDataJSON: ArrayBuffer;
    authenticatorData: ArrayBuffer;
    signature: ArrayBuffer;
    userHandle: ArrayBuffer | null;
  }
  
  interface AuthenticatorResponse {
    clientDataJSON: ArrayBuffer;
  }
  
  interface AuthenticationExtensionsClientOutputs {
    [key: string]: any;
  }
}

export {};
