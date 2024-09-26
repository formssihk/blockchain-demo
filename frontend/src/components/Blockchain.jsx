/* eslint-disable react/prop-types */
import Block from './Block';

function Blockchain({ clientId, blocks, updateBlock, rehashBlock, nodeIndex, showTick, confirmBlock }) {
  const storedClientId = localStorage.getItem('clientId');
  return (
    <>
      <div>
        <h2 className="text-lg font-bold mt-2">{storedClientId === clientId ? "My Node": `Node ${clientId}`}</h2>
      </div>
      <div className="blockchain p-4 border rounded flex overflow-x-auto p-2 space-x-4 border p-4">
        {blocks && blocks.map((block, index) => (
          <Block
            key={index}
            block={block}
            index={index}
            updateBlock={(data) => updateBlock(index, data)}
            rehashBlock={() => rehashBlock(index)}
            confirmBlock={(data) => confirmBlock(index, data)}
            blocks={blocks}
            showTick={index === blocks.length - 1 && showTick} // Show tick only for the latest block
            clientId={clientId}
          />
        ))}
      </div>
    </>
  );
}

export default Blockchain;
