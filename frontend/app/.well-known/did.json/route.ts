import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const host = req.headers.get('host');

  let appViewHost = 'rito.blue'

  if (process.env.NODE_ENV !== 'production') {
    appViewHost = 'dev.rito.blue'
  }

  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1"
    ],
    "id": `did:web:${host}`,
    "service": [
      {
        "id": "#rito_appview",
        "type": "AtprotoAppView",
        "serviceEndpoint": `https://${appViewHost}`
      }
    ]
  };

  return NextResponse.json(didDocument);
}