import { NextResponse } from 'next/server';

export async function GET() {
  const jwks = {
    keys: [
      {
        kty: "EC",
        use: "sig",
        alg: "ES256",
        kid: "key1",
        crv: "P-256",
        x: "J8aBLg6gQa5CcDB9if_yJ035ExNpBJJpj1K5Q78dXsE",
        y: "8GzBgTjTSUi-gR0zeTWVW4sizVJbM9lVzsBO3KkPpb4",
      }
    ]
  };

  return NextResponse.json(jwks);
}
