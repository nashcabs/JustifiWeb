#!/usr/bin/env node
/**
 * SRI Hash Generator for External Resources
 * Generates SHA-384 integrity hashes for CDN resources
 * 
 * Usage: node generate-sri-hashes.js
 */

const crypto = require('crypto');
const https = require('https');

const resources = [
  {
    name: 'Google Fonts CSS',
    url: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap'
  }
];

async function fetchAndHash(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const hash = crypto
            .createHash('sha384')
            .update(data, 'utf8')
            .digest('base64');
          resolve(`sha384-${hash}`);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function generateAllHashes() {
  console.log('🔐 Generating SRI Hashes for External Resources\n');
  console.log('=' .repeat(70));
  
  for (const resource of resources) {
    try {
      console.log(`\n📦 ${resource.name}`);
      console.log(`URL: ${resource.url}`);
      
      const hash = await fetchAndHash(resource.url);
      
      console.log(`\n✅ Integrity Hash:`);
      console.log(`${hash}`);
      
      console.log(`\n📋 HTML Example:`);
      console.log(`<link`);
      console.log(`  rel="stylesheet"`);
      console.log(`  href="${resource.url}"`);
      console.log(`  integrity="${hash}"`);
      console.log(`  crossorigin="anonymous"`);
      console.log(`/>`);
      
    } catch (error) {
      console.error(`\n❌ Error processing ${resource.name}:`, error.message);
    }
    
    console.log('\n' + '=' .repeat(70));
  }
  
  console.log('\n💡 Tips:');
  console.log('  1. Copy the integrity hash and add it to your HTML');
  console.log('  2. Always include crossorigin="anonymous" attribute');
  console.log('  3. Update SRI hashes when external resources change');
  console.log('  4. Store hashes in version control');
}

generateAllHashes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
