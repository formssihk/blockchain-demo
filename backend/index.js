const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const path = require('path');
const app = express();

const CONSENSUS_PERCENTAGE = 67; // 67% consensus required for block confirmation

let blockchainData = [];

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

const loadBlockchain = () => {
  if (fs.existsSync('blockchain.json')) {
    const data = fs.readFileSync('blockchain.json', 'utf8');
    blockchainData = JSON.parse(data);
  } else {
    blockchainData = [];
    // saveBlockchain();
  }
};

loadBlockchain();

// Save blockchain to a file
const saveBlockchain = () => {
  fs.writeFileSync('blockchain.json', JSON.stringify(blockchainData, null, 2));
};

function createGenesisBlock() {
  return {
    index: 0,
    data: "Genesis Block",
    previousHash: "0",
    hash: calculateHash(0, "Genesis Block", "0"),
    isValid: true,
    addedBy: "system", 
    isConfirmed: true,
    wasTampered: false,
    isRejected: false,
  };
}


// Calculate hash for the block
function calculateHash(index, data, previousHash) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(index + data + previousHash).digest('hex');
}

// Check if a clientId exists in the blockchain data
const findNodeByClientId = (clientId) => {
  const data = blockchainData.find(node => node.clientId === clientId);
  return data;
};

app.get('/blocks', (req, res) => {
  // loadBlockchain();
  res.json(blockchainData);
});

app.post('/blocks', (req, res) => {
  const { newBlockData, clientId } = req.body;

  if (!newBlockData || newBlockData.trim() === '') {
    return res.status(400).json({ error: "Block data is required" });
  }

  if (!clientId || clientId.trim() === '') {
    return res.status(400).json({ error: "Client ID is required" });
  }

  // Find the node that corresponds to the clientId
  const node = findNodeByClientId(clientId);

  if (!node) {
    return res.status(404).json({ error: "Client ID not found" });
  }

  // Check if any block in the user's chain has been tampered
  const tamperedBlock = node.blocks.find(block => block.wasTampered);

  if (tamperedBlock) {
    return res.status(403).json({ 
      error: `A previous block in the chain (block index ${tamperedBlock.index}) has been tampered with. New blocks cannot be added until the issue is resolved.` 
    });
  }

  // Get the previous block (last block in the node)
  const previousBlock = node.blocks[node.blocks.length - 1];

  // Check if the previous block has been confirmed by 67% of nodes
  if (!hasConsensus(previousBlock.index)) {
    return res.status(403).json({ error: "Previous block has not been confirmed by 67% of nodes. Block cannot be added." });
  }

  const newBlock = {
    index: previousBlock.index + 1,
    data: newBlockData,
    previousHash: previousBlock.hash,
    hash: calculateHash(previousBlock.index + 1, newBlockData, previousBlock.hash),
    isValid: true,
    addedBy: clientId,
    isConfirmed: false,
    wasTampered: false,
    isRejected: false, 
  };

  // Keep track of nodes that did not receive the new block due to tampering
  const nodesSkippedDueToTampering = [];

  // Add the new block to all nodes that are not tampered
  blockchainData.forEach(node => {
    const tamperedBlock = node.blocks.find(block => block.wasTampered);

    if (!tamperedBlock) {
      const copiedBlock = { ...newBlock }; // Create a shallow copy of the new block
      node.blocks.push(copiedBlock); // Add the block only if no tampered blocks
    } else {
      nodesSkippedDueToTampering.push(node.clientId);
    }
  });

  // Save the updated blockchain data
  saveBlockchain();

  // Broadcast the updated blockchain to all clients
  broadcastBlockchain();

  // Respond with the newly added block and information on which nodes were skipped
  if (nodesSkippedDueToTampering.length > 0) {
    res.status(207).json({
      message: "New block added, but skipped for some nodes due to tampered blocks.",
      skippedNodes: nodesSkippedDueToTampering,
      newBlock
    });
  } else {
    res.json(newBlock);
  }
});

// Helper function to check if a block with the given index has consensus (67% confirmed)
const hasConsensus = (blockIndex) => {
  let confirmedCount = 0;
  const totalNodes = blockchainData.length;

  // Loop through all nodes and count confirmations for the block with the given index
  blockchainData.forEach(node => {
    const block = node.blocks.find(b => b.index === blockIndex);
    if (block && block.isConfirmed) {
      confirmedCount++;
    }
  });

  // Calculate percentage of nodes that have confirmed the block
  const consensusPercentage = (confirmedCount / totalNodes) * 100;

  console.log(`Consensus for block ${blockIndex}: ${consensusPercentage}%`);

  // Return true if more than 67% of nodes have confirmed the block, otherwise false
  return consensusPercentage > CONSENSUS_PERCENTAGE;
};

app.post('/blocks/tampered', (req, res) => {
  const { clientId, blockIndex } = req.body;

  // Find the node and block to update
  const node = findNodeByClientId(clientId);
  if (!node) {
    return res.status(404).json({ error: "Client ID not found" });
  }

  // Ensure the block exists
  const block = node.blocks.find(b => b.index === blockIndex);
  if (!block) {
    return res.status(404).json({ error: "Block not found" });
  }

  // Mark the tampered block and all subsequent blocks as tampered
  for (let i = blockIndex; i < node.blocks.length; i++) {
    node.blocks[i].wasTampered = true;
  }

  // Save the blockchain and broadcast the tampered status to all clients
  saveBlockchain();
  broadcastBlockchain();

  res.json({ message: `Block at index ${blockIndex} and all subsequent blocks for clientId ${clientId} marked as tampered.` });
});

app.delete('/blocks', (req, res) => {
  const { clientId } = req.body; 

  if (!clientId || clientId.trim() === '') {
    return res.status(400).json({ error: "Client ID is required" });
  }

  // Find the node with the specified clientId
  const userNode = blockchainData.find(node => node.clientId === clientId);

  if (!userNode) {
    return res.status(404).json({ error: "Client ID not found" });
  }

  // Reset all nodes (including the user's node) to only have the Genesis block
  blockchainData.forEach(node => {
    node.blocks = [createGenesisBlock()]; // Reset each node's blocks to only the Genesis block
  });

  // Save the updated blockchain data to the file
  saveBlockchain();

  // Broadcast the updated blockchain to all clients
  broadcastBlockchain();

  // Respond with a success message
  res.json({ message: `All nodes were reset to only contain the Genesis block.` });
});

app.post('/confirm', (req, res) => {
  const { clientId, data } = req.body; 
  if (!clientId || clientId.trim() === '') {
    return res.status(400).json({ error: "Client ID is required" });
  }

  const { index } = data; // Assuming block index is passed in the data

  console.log(`Confirming block at index ${index} for clientId ${clientId}`);
  const blockData = blockchainData.find(node => node.clientId === clientId);
  if (!blockData) {
    return res.status(404).json({ error: "Client ID not found" });
  }

  // Find the block with the specified index in this client's node
  const block = blockData.blocks.find(b => b.index === index);
  if (!block) {
    return res.status(404).json({ error: "Block not found" });
  }

  // Update only this block's isConfirmed field
  block.isConfirmed = true;

  // Save the updated blockchain to the file (which now contains the specific change for this client)
  saveBlockchain();

  // Broadcast the updated blockchain to all clients (they will receive the correct structure with the single block updated)
  broadcastBlockchain();

  // Respond with a success message
  res.json({ message: `Block at index ${index} for clientId ${clientId} confirmed.` });
});

app.post('/reject', (req, res) => {
  const { clientId, data } = req.body; 
  if (!clientId || clientId.trim() === '') {
    return res.status(400).json({ error: "Client ID is required" });
  }

  const { index } = data; // Assuming block index is passed in the data

  console.log(`Confirming block at index ${index} for clientId ${clientId}`);
  const blockData = blockchainData.find(node => node.clientId === clientId);
  if (!blockData) {
    return res.status(404).json({ error: "Client ID not found" });
  }

  // Find the block with the specified index in this client's node
  const block = blockData.blocks.find(b => b.index === index);
  if (!block) {
    return res.status(404).json({ error: "Block not found" });
  }

  // Update only this block's isConfirmed field
  block.isRejected = true;

  // Save the updated blockchain to the file (which now contains the specific change for this client)
  saveBlockchain();

  // Broadcast the updated blockchain to all clients (they will receive the correct structure with the single block updated)
  broadcastBlockchain();

  // Respond with a success message
  res.json({ message: `Block at index ${index} for clientId ${clientId} rejected.` });
});




// WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // Store the clientId for the current WebSocket connection
  let clientId = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received message:', data);

    // Check if client has a clientId (sent from the frontend)
    if (data.clientId) {
      clientId = data.clientId; // Store the clientId in the connection context
      const existingNode = findNodeByClientId(clientId);

      if (existingNode) {
        console.log(`Client connected with existing clientId: ${clientId}`);
        ws.send(JSON.stringify({ type: 'clientId', clientId: clientId, blocks: existingNode.blocks }));
      } else {
        console.log(`ClientId ${clientId} not found, creating new node.`);
        const newNode = {
          clientId: clientId,
          blocks: blockchainData.length > 0 ? deepCopyBlocks(blockchainData[0].blocks) : [createGenesisBlock()],
        };
        blockchainData.push(newNode);
        saveBlockchain();

        ws.send(JSON.stringify({ type: 'clientId', clientId: clientId, blocks: newNode.blocks }));
        broadcastBlockchain();
      }
    } else {
      const newClientId = uuidv4();
      console.log(`Generated new clientId: ${newClientId}`);

      const newNode = {
        clientId: newClientId,
        blocks: blockchainData.length > 0 ? deepCopyBlocks(blockchainData[0].blocks) : [createGenesisBlock()],
      };

      blockchainData.push(newNode);
      saveBlockchain();

      ws.send(JSON.stringify({ type: 'clientId', clientId: newClientId, blocks: newNode.blocks }));
      broadcastBlockchain();

      clientId = newClientId; // Store the new clientId
    }
  });

  ws.on('close', () => {
    if (clientId) {
      console.log(`WebSocket connection closed for clientId: ${clientId}`);

      // Remove the node associated with the closed connection
      const nodeIndex = blockchainData.findIndex(node => node.clientId === clientId);

      if (nodeIndex !== -1) {
        blockchainData.splice(nodeIndex, 1); // Remove the node
        saveBlockchain(); // Save the updated blockchain
        broadcastBlockchain(); // Notify other clients
        console.log(`Node with clientId ${clientId} removed from blockchain.`);
      }
    }
  });
});


const deepCopyBlocks = (blocks) => {
  return blocks.map(block => ({
    index: block.index,
    data: block.data,
    previousHash: block.previousHash,
    hash: block.hash,
    isValid: block.isValid,
    addedBy: block.addedBy,
    isConfirmed: block.isConfirmed
  }));
};



// Broadcast updated blockchain to all clients
function broadcastBlockchain() {
  const data = JSON.stringify({ type: 'update', blockchain: blockchainData });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Serve static files from the frontend dist folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for any unknown routes (enables React client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Blockchain API and WebSocket listening at http://localhost:${PORT}`);
});
