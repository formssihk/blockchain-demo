/* eslint-disable react/prop-types */
import Block from './Block';

function Blockchain({ clientId, blocks, updateBlock, rehashBlock, nodeIndex, showTick }) {
  return (
    <>
      <div>
        <h2 className="text-lg font-bold mt-2">Node {clientId}</h2>
      </div>
      <div className="blockchain p-4 border rounded flex overflow-x-auto p-2 space-x-4 border p-4">
        {blocks && blocks.map((block, index) => (
          <Block
            key={index}
            block={block}
            index={index}
            updateBlock={(data) => updateBlock(index, data)}
            rehashBlock={() => rehashBlock(index)}
            blocks={blocks}
            showTick={index === blocks.length - 1 && showTick} // Show tick only for the latest block
          />
        ))}
      </div>
    </>
  );
}

export default Blockchain;
