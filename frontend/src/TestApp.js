import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'blue' }}>🎉 React 测试页面</h1>
      <p>如果你能看到这个页面，说明React正在正常工作！</p>
      <div style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '10px', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3>系统状态：</h3>
        <ul>
          <li>✅ React 正常运行</li>
          <li>✅ 页面渲染成功</li>
          <li>⏳ 等待后端连接测试...</li>
        </ul>
      </div>
      <button 
        onClick={() => alert('按钮点击正常！')}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        测试按钮
      </button>
    </div>
  );
}

export default TestApp;
