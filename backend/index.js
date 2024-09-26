const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const app = express();
const port = 3000;

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
    saveBlockchain();
  }
};

loadBlockchain();

// Save blockchain to a file
const saveBlockchain = () => {
  console.log(`
  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    Saving blockchain data:', ${JSON.stringify(blockchainData)}
  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  `);
  fs.writeFileSync('blockchain.json', JSON.stringify(blockchainData, null, 2));
};

// Create Genesis block
function createGenesisBlock() {
  return {
    index: 0,
    data: "Genesis Block",
    previousHash: "0",
    hash: calculateHash(0, "Genesis Block", "0"),
    isValid: true,
    addedBy: "system", 
    isConfirmed: true,
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

// API to fetch all blockchain data
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

  // Get the previous block (last block in the first node)
  const previousBlock = node.blocks[node.blocks.length - 1];

  // Create a new block with the new data
  const newBlock = {
    index: previousBlock.index + 1,
    data: newBlockData,
    previousHash: previousBlock.hash,
    hash: calculateHash(previousBlock.index + 1, newBlockData, previousBlock.hash),
    isValid: true,
    addedBy: clientId,
    isConfirmed: false,
  };

  // Add the new block to all nodes, but deep copy the block to ensure no reference sharing
  blockchainData.forEach(node => {
    const copiedBlock = { ...newBlock }; // Create a shallow copy of the new block
    node.blocks.push(copiedBlock); // Each node gets its own independent copy
  });

  // Save the updated blockchain to the file
  saveBlockchain();

  // Broadcast the updated blockchain to all clients
  broadcastBlockchain();

  // Respond with the newly added block
  res.json(newBlock);
});



app.delete('/blocks', (req, res) => {
  const { clientId } = req.body; // Capture the clientId from the request body

  if (!clientId || clientId.trim() === '') {
    return res.status(400).json({ error: "Client ID is required" });
  }

  // Find the index of the node with the specified clientId
  const nodeIndex = blockchainData.findIndex(node => node.clientId === clientId);

  if (nodeIndex === -1) {
    // If the clientId does not exist, return an error
    return res.status(404).json({ error: "Client ID not found" });
  }

  // Remove all blocks except the Genesis block for all nodes
  blockchainData.forEach(node => {
    if (node.blocks.length > 1) {
      node.blocks = [node.blocks[0]]; // Keep only the Genesis block
    }
  });

  // Save the updated blockchain data to the file
  saveBlockchain();

  // Broadcast the updated blockchain to all clients
  broadcastBlockchain();

  // Respond with a success message
  res.json({ message: `All blocks added by clientId ${clientId} were removed successfully, only Genesis blocks remain.` });
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

  console.log(`==============BLOCKCHAIN DATA AFTER UPDATE===================\nNode ${JSON.stringify(blockchainData)}\nBlock ${JSON.stringify(block)} confirmed.\n`);

  // Save the updated blockchain to the file (which now contains the specific change for this client)
  saveBlockchain();

  // Broadcast the updated blockchain to all clients (they will receive the correct structure with the single block updated)
  broadcastBlockchain();

  // Respond with a success message
  res.json({ message: `Block at index ${index} for clientId ${clientId} confirmed.` });
});




// WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received message:', data);

    // Check if client has a clientId (sent from the frontend)
    if (data.clientId) {
      const existingNode = findNodeByClientId(data.clientId);

      if (existingNode) {
        console.log(`Client connected with existing clientId: ${data.clientId}`);
        ws.send(JSON.stringify({ type: 'clientId', clientId: data.clientId, blocks: existingNode.blocks }));
      } else {
        console.log(`ClientId ${data.clientId} not found, creating new node.`);
        const newNode = {
          clientId: data.clientId,
          blocks: blockchainData.length > 0 ? deepCopyBlocks(blockchainData[0].blocks) : [createGenesisBlock()],
        };
        blockchainData.push(newNode);
        saveBlockchain();

        ws.send(JSON.stringify({ type: 'clientId', clientId: data.clientId, blocks: newNode.blocks }));
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
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
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
  console.log(`Broadcasting updated blockchain to all clients ${JSON.stringify(blockchainData)}`);
  const data = JSON.stringify({ type: 'update', blockchain: blockchainData });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Start the server and WebSocket on the same port
server.listen(port, () => {
  console.log(`Blockchain API and WebSocket listening at http://localhost:${port}`);
});
