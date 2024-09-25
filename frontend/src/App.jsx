import { useState, useEffect } from 'react';
import Blockchain from './components/Blockchain';
import './App.css';
import axios from 'axios';
import sha256 from 'crypto-js/sha256';

const BASE_URL = 'http://localhost:3000';

function App() {
  const [nodes, setNodes] = useState([]); // Each node is an object containing clientId and blocks
  const [newBlockData, setNewBlockData] = useState('');
  const [ticks, setTicks] = useState([]); // Ticks state dynamically adjusts based on number of nodes

  useEffect(() => {
    const fetchBlockchain = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/blocks`);
        setNodes(response.data); // Set the nodes from the response (including clientId and blocks)
        setTicks(new Array(response.data.length).fill(false)); // Initialize ticks based on node count
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
      }
    };

    fetchBlockchain();

    // WebSocket connection for real-time updates
    const socket = new WebSocket(`ws://localhost:3000`);

    socket.onopen = () => {
      console.log('WebSocket connection opened');
    };

    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.type === 'update') {
        setNodes(data.blockchain);
        setTicks(new Array(data.blockchain.length).fill(false)); // Reset ticks when blockchain updates
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (socket.readyState === 1) {
          socket.close();
      }
    };
  }, []);

  const addBlock = async () => {
    if (newBlockData.trim() === '') {
      alert("Please enter data for the new block.");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/blocks`, { newBlockData });
      setNewBlockData('');
    } catch (error) {
      console.error('Error adding new block:', error);
    }
  };

  const confirmBlock = async (nodeIndex) => {
    try {
      await axios.post(`${BASE_URL}/confirm`, { nodeIndex });
      setTicks((prevTicks) => {
        const newTicks = [...prevTicks];
        newTicks[nodeIndex] = true;
        return newTicks;
      });
    } catch (error) {
      console.error('Error confirming block:', error);
    }
  };

  const updateBlock = (nodeIndex, blockIndex, data) => {
    console.log("data blockchain", nodeIndex, blockIndex, data);

    const updatedNodes = [...nodes];
    const block = updatedNodes[nodeIndex].blocks[blockIndex];
    const blockCurrHash = sha256(block.index + data + block.previousHash).toString();
    const updatedBlock = { ...block, data, hash: blockCurrHash, isValid: false };
    
    // Update the block in the corresponding node
    updatedNodes[nodeIndex].blocks[blockIndex] = updatedBlock;
    setNodes(updatedNodes);
  };

  const rehashBlock = (nodeIndex, blockIndex) => {
    const updatedNodes = [...nodes];
    const block = updatedNodes[nodeIndex].blocks[blockIndex];
    const blockCurrHash = sha256(block.index + block.data + block.previousHash).toString();
    const updatedBlock = { ...block, hash: blockCurrHash };

    // Update the block in the corresponding node
    updatedNodes[nodeIndex].blocks[blockIndex] = updatedBlock;
    setNodes(updatedNodes);
  };

  return (
    <div className="App">
      <input
        type="text"
        value={newBlockData}
        onChange={(e) => setNewBlockData(e.target.value)}
        placeholder="Enter new block data"
        className="p-2 border rounded mr-4 text-sm"
      />
      <button
        onClick={addBlock}
        className="p-2 bg-blue-500 text-white rounded mb-4"
      >
        Add Block
      </button>
      <div>
        {nodes.map((node, nodeIndex) => (
          <Blockchain
            key={nodeIndex}
            clientId={node.clientId} // Pass the clientId to the Blockchain component
            blocks={node.blocks} // Pass the array of blocks for this node
            updateBlock={(blockIndex, data) => updateBlock(nodeIndex, blockIndex, data)}
            rehashBlock={(blockIndex) => rehashBlock(nodeIndex, blockIndex)}
            nodeIndex={nodeIndex}
            showTick={ticks[nodeIndex]} // Pass the tick state for the current node
          />
        ))}
      </div>
    </div>
  );
}

export default App;
