import { useState, useEffect } from 'react';
import Blockchain from './components/Blockchain';
import './App.css';
import axios from 'axios';
import sha256 from 'crypto-js/sha256';

const BASE_URL = 'http://localhost:3000';

function App() {
  const [nodes, setNodes] = useState([]); 
  const [newBlockData, setNewBlockData] = useState('');
  const [ticks, setTicks] = useState([]);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    const storedClientId = localStorage.getItem('clientId');
    // Fetch blockchain data
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
      if (storedClientId) {
        // Send the existing clientId to the backend
        console.log('Sending existing clientId to the server:', storedClientId);
        socket.send(JSON.stringify({ clientId: storedClientId }));
      } else {
        socket.send(JSON.stringify({ clientId: null }));
      }
    };
  
    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.type === 'clientId') {
        // Store the clientId in localStorage and update the state
        localStorage.setItem('clientId', data.clientId);
        setClientId(data.clientId);
        console.log('New clientId received and saved:', data.clientId);
      } else if (data.type === 'update') {
        // Handle blockchain updates
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
  
    // Cleanup WebSocket connection when component unmounts
    return () => {
      if (socket.readyState === WebSocket.OPEN ) {
        console.log('Closing WebSocket connection');
        socket.close();
      }
    };
  }, []); // Empty array ensures this effect runs only once, on mount
  

  const addBlock = async () => {
    if (newBlockData.trim() === '') {
      alert("Please enter data for the new block.");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/blocks`, { newBlockData, clientId });
      setNewBlockData('');
    } catch (error) {
      console.error('Error adding new block:', error);
    }
  };

  const confirmBlock = async (nodeIndex, data) => {
    console.log("confirm block", nodeIndex, data);
    // try {
    //   await axios.post(`${BASE_URL}/confirm`, { nodeIndex });
    //   setTicks((prevTicks) => {
    //     const newTicks = [...prevTicks];
    //     newTicks[nodeIndex] = true;
    //     return newTicks;
    //   });
    // } catch (error) {
    //   console.error('Error confirming block:', error);
    // }
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

  const deleteBlockchain = async () => {
    const storedClientId = localStorage.getItem('clientId'); // Get the clientId from localStorage
  
    if (!storedClientId) {
      alert('No client ID found in local storage');
      return;
    }
  
    try {
      // Send a DELETE request to the server with the clientId
      await axios.delete(`${BASE_URL}/blocks`, {
        data: { clientId: storedClientId }, // Send clientId in the request body
      });
  
      // Remove the clientId from localStorage
      localStorage.removeItem('clientId');
  
      // Update the state to clear nodes in the frontend
      setNodes([]);
  
      alert('Blockchain data deleted successfully');
    } catch (error) {
      console.error('Error deleting blockchain:', error);
      alert('Failed to delete blockchain data');
    }
  };
  

  return (
    <div className="App">
      <div className='flex '>
        <div>
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
        </div>
        <button
          onClick={deleteBlockchain}
          className="p-2 bg-red-500 text-white rounded mb-4"
        >
          Delete Node Data
        </button>

      </div>
      <div>
        {nodes.map((node, nodeIndex) => (
          <Blockchain
            key={nodeIndex}
            clientId={node.clientId} // Pass the clientId to the Blockchain component
            blocks={node.blocks} // Pass the array of blocks for this node
            updateBlock={(blockIndex, data) => updateBlock(nodeIndex, blockIndex, data)}
            rehashBlock={(blockIndex) => rehashBlock(nodeIndex, blockIndex)}
            confirmBlock={(blockIndex) => confirmBlock(nodeIndex, blockIndex)}
            nodeIndex={nodeIndex}
            showTick={ticks[nodeIndex]} // Pass the tick state for the current node
          />
        ))}
      </div>
    </div>
  );
}

export default App;
