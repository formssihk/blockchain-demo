/* eslint-disable react/prop-types */
import Block from './Block';

import React, { useState, useEffect } from 'react';

function Blockchain({ clientId, blocks, updateBlock, rehashBlock, nodeIndex, showTick, confirmBlock, rejectBlock }) {
  const [hashedClientId, setHashedClientId] = useState(null); // Store the hashed UUID
  const storedClientId = localStorage.getItem('clientId');

  // Async function to hash the UUID
  async function hashUUID(uuid) {
    const encoder = new TextEncoder();
    const data = encoder.encode(uuid);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const largeNumber = BigInt(`0x${hashHex}`);

    const shortNumber = largeNumber % 100n;

    return Number(shortNumber);
  }

  useEffect(() => {
    const computeHashedClientId = async () => {
      const hash = await hashUUID(clientId);
      setHashedClientId(hash);
    };

    computeHashedClientId();
  }, [clientId]);

  return (
    <div className='flex flex-col overflow-x-scroll'>
      <div>
        <h2 className="text-lg font-bold mx-2 lg:mx-4 mb-1 lg:my-2">
          {storedClientId === clientId 
            ? `My Node ${hashedClientId}` 
            : `Node ${hashedClientId}`}
        </h2>
      </div>
      <div 
        className="p-2 lg:p-4 border rounded flex overflow-x-scroll space-x-4 flex-none"
        style={{ width: '98vw' }}
      >
        {blocks && blocks.map((block, index) => (
          <Block
            key={index}
            block={block}
            index={index}
            updateBlock={(data) => updateBlock(index, data)}
            rehashBlock={() => rehashBlock(index)}
            confirmBlock={(data) => confirmBlock(index, data)}
            rejectBlock={(data) => rejectBlock(index, data)}
            blocks={blocks}
            showTick={index === blocks.length - 1 && showTick} // Show tick only for the latest block
            clientId={clientId}
          />
        ))}
      </div>
    </div>
  );
}

export default Blockchain;
