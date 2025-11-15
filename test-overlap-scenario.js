// 测试场景：重现蓝色卡片不避让的问题
// 基于图像中的布局：
// 红色卡片：位置 (3,2)，尺寸 2×2
// 蓝色卡片：位置 (2,2)，尺寸 2×2

const testScenario = {
  draggedCard: {
    id: 'red-card',
    position: { x: 3, y: 2 },
    size: 'wide' // 2×2
  },
  existingCards: [
    {
      id: 'blue-card',
      position: { x: 2, y: 2 },
      size: 'wide' // 2×2
    }
  ],
  columns: 6
};

// 手动模拟避让计算过程
function simulateAvoidance() {
  const { draggedCard, existingCards, columns } = testScenario;
  
  // 1. 构建占用网格
  const maxY = 6; // 假设网格高度
  const occ = Array.from({ length: maxY }, () => Array.from({ length: columns }, () => 0));
  
  // 2. 标记现有卡片占用
  existingCards.forEach(card => {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const gx = card.position.x + dx;
        const gy = card.position.y + dy;
        if (gy >= 0 && gy < maxY && gx >= 0 && gx < columns) {
          occ[gy][gx] = 1;
        }
      }
    }
  });
  
  console.log('占用网格状态:');
  occ.forEach((row, y) => {
    console.log(`行 ${y}: [${row.join(', ')}]`);
  });
  
  // 3. 检查碰撞
  const draggedRect = { x: 3, y: 2, w: 2, h: 2 };
  const blueRect = { x: 2, y: 2, w: 2, h: 2 };
  
  const isOverlap = !(draggedRect.x + draggedRect.w <= blueRect.x ||
                     blueRect.x + blueRect.w <= draggedRect.x ||
                     draggedRect.y + draggedRect.h <= blueRect.y ||
                     blueRect.y + blueRect.h <= draggedRect.y);
  
  console.log('碰撞检测结果:', isOverlap);
  
  // 4. 尝试为蓝色卡片寻找避让位置
  const blueCard = existingCards[0];
  const directions = [
    { x: 0, y: -1 }, // 上
    { x: 0, y: 1 },  // 下
    { x: -1, y: 0 }, // 左
    { x: 1, y: 0 }   // 右
  ];
  
  directions.forEach(dir => {
    const newPos = {
      x: blueCard.position.x + dir.x,
      y: blueCard.position.y + dir.y
    };
    
    // 检查边界
    if (newPos.x < 0 || newPos.y < 0 || newPos.x + 2 > columns) {
      console.log(`方向 ${dir.x},${dir.y}: 边界检查失败`);
      return;
    }
    
    // 检查是否与其他卡片冲突（在这个简化场景中只有拖动卡片）
    const newRect = { x: newPos.x, y: newPos.y, w: 2, h: 2 };
    const conflictWithDragged = !(newRect.x + newRect.w <= draggedRect.x ||
                                  draggedRect.x + draggedRect.w <= newRect.x ||
                                  newRect.y + newRect.h <= draggedRect.y ||
                                  draggedRect.y + draggedRect.h <= newRect.y);
    
    console.log(`方向 ${dir.x},${dir.y}: 新位置 (${newPos.x},${newPos.y})，与拖动卡片冲突: ${conflictWithDragged}`);
  });
}

// 运行模拟
simulateAvoidance();