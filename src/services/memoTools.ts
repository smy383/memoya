import AsyncStorage from '@react-native-async-storage/async-storage';

export const getMemoTools = (t: (key: string) => string) => {
  return [
    {
      name: "search_memos",
      description: t('ai.tools.searchMemos.description'),
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: t('ai.tools.searchMemos.keyword')
          },
          date_from: {
            type: "string", 
            description: t('ai.tools.searchMemos.dateFrom')
          },
          date_to: {
            type: "string",
            description: t('ai.tools.searchMemos.dateTo')
          },
          month: {
            type: "string",
            description: t('ai.tools.searchMemos.month')
          },
          limit: {
            type: "number",
            description: t('ai.tools.searchMemos.limit')
          }
        }
      }
    },
    {
      name: "get_memo_stats",
      description: t('ai.tools.getStats.description'),
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: t('ai.tools.getStats.statsType'),
            enum: ["total_count", "monthly_distribution", "recent_activity"]
          }
        },
        required: ["type"]
      }
    },
    {
      name: "generate_summary",
      description: t('ai.tools.generateSummary.description'),
      parameters: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: t('ai.tools.generateSummary.dateFrom')
          },
          date_to: {
            type: "string", 
            description: t('ai.tools.generateSummary.dateTo')
          },
          month: {
            type: "string",
            description: t('ai.tools.generateSummary.month')
          },
          keyword: {
            type: "string",
            description: t('ai.tools.generateSummary.keyword')
          },
          summary_length: {
            type: "string",
            description: t('ai.tools.generateSummary.summaryLength'),
            enum: ["brief", "detailed", "comprehensive"]
          }
        }
      }
    },
    {
      name: "extract_tasks",
      description: t('ai.tools.extractTasks.description'),
      parameters: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: t('ai.tools.extractTasks.dateFrom')
          },
          date_to: {
            type: "string",
            description: t('ai.tools.extractTasks.dateTo')
          },
          keyword: {
            type: "string",
            description: t('ai.tools.extractTasks.keyword')
          }
        }
      }
    },
    {
      name: "create_memo",
      description: t('ai.tools.createMemo.description'),
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: t('ai.tools.createMemo.content')
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: t('ai.tools.createMemo.tags')
          }
        },
        required: ["content"]
      }
    },
    {
      name: "update_memo",
      description: t('ai.tools.updateMemo.description'),
      parameters: {
        type: "object",
        properties: {
          memo_id: {
            type: "string",
            description: t('ai.tools.updateMemo.memoId')
          },
          new_content: {
            type: "string",
            description: t('ai.tools.updateMemo.newContent')
          }
        },
        required: ["memo_id", "new_content"]
      }
    },
    {
      name: "delete_memo",
      description: t('ai.tools.deleteMemo.description'),
      parameters: {
        type: "object",
        properties: {
          memo_id: {
            type: "string",
            description: t('ai.tools.deleteMemo.memoId')
          }
        },
        required: ["memo_id"]
      }
    }
  ];
};

export const executeMemoTool = async (functionName: string, args: any, roomId?: string, t?: (key: string, params?: any) => string) => {
  try {
    switch (functionName) {
      case 'search_memos':
        return await searchMemos(args, roomId);
      case 'get_memo_stats':
        return await getMemoStats(args, roomId);
      case 'generate_summary':
        return await generateSummary(args, roomId);
      case 'extract_tasks':
        return await extractTasks(args, roomId);
      case 'create_memo':
        return await createMemoPreview(args, roomId);
      case 'update_memo':
        return await updateMemoPreview(args, roomId);
      case 'delete_memo':
        return await deleteMemoPreview(args, roomId);
      default:
        return {
          success: false,
          message: `알 수 없는 도구: ${functionName}`
        };
    }
  } catch (error) {
    console.error(`Error executing tool ${functionName}:`, error);
    return {
      success: false,
      message: `도구 실행 중 오류가 발생했습니다: ${error}`
    };
  }
};

const searchMemos = async (args: any, roomId?: string) => {
  try {
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const activeMemos = await AsyncStorage.getItem(memosKey);
    const memos = activeMemos ? JSON.parse(activeMemos) : [];
    
    let filteredMemos = memos;
    
    if (args.keyword) {
      filteredMemos = filteredMemos.filter((memo: any) =>
        memo.content.toLowerCase().includes(args.keyword.toLowerCase())
      );
    }
    
    if (args.date_from || args.date_to || args.month) {
      filteredMemos = filteredMemos.filter((memo: any) => {
        const memoDate = new Date(memo.timestamp);
        
        if (args.month) {
          const monthStr = memoDate.toISOString().substring(0, 7);
          return monthStr === args.month;
        }
        
        if (args.date_from) {
          const fromDate = new Date(args.date_from);
          if (memoDate < fromDate) return false;
        }
        
        if (args.date_to) {
          const toDate = new Date(args.date_to + 'T23:59:59');
          if (memoDate > toDate) return false;
        }
        
        return true;
      });
    }
    
    const limit = args.limit || 10;
    filteredMemos = filteredMemos.slice(0, limit);
    
    // 구조화된 메시지 생성
    let structuredMessage = `${filteredMemos.length}개의 메모를 찾았습니다.\n\n`;
    
    if (filteredMemos.length > 0) {
      structuredMessage += '📝 찾은 메모들:\n';
      filteredMemos.forEach((memo: any, index: number) => {
        const date = new Date(memo.timestamp).toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric', 
          hour: '2-digit',
          minute: '2-digit'
        });
        structuredMessage += `\n${index + 1}. [${date}]\n${memo.content}\n`;
        if (index < filteredMemos.length - 1) {
          structuredMessage += '---\n';
        }
      });
    } else {
      structuredMessage = '검색 조건에 맞는 메모가 없습니다.';
    }
    
    return {
      success: true,
      data: filteredMemos.map((memo: any) => ({
        id: memo.id,
        content: memo.content,
        timestamp: memo.timestamp,
        formattedDate: new Date(memo.timestamp).toLocaleString('ko-KR')
      })),
      message: structuredMessage
    };
  } catch (error) {
    return {
      success: false,
      message: '메모 검색 중 오류가 발생했습니다.'
    };
  }
};

const getMemoStats = async (args: any, roomId?: string) => {
  try {
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const activeMemos = await AsyncStorage.getItem(memosKey);
    const memos = activeMemos ? JSON.parse(activeMemos) : [];
    
    switch (args.type) {
      case 'total_count':
        const recentForCount = memos
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3);
        
        let countMessage = `총 ${memos.length}개의 메모가 있습니다.`;
        if (recentForCount.length > 0) {
          countMessage += '\n\n최근 메모 미리보기:';
          recentForCount.forEach((memo: any, index: number) => {
            const date = new Date(memo.timestamp).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric'
            });
            const preview = memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : '');
            countMessage += `\n${index + 1}. [${date}] ${preview}`;
          });
        }
        
        return {
          success: true,
          data: {
            totalCount: memos.length,
            recentMemos: recentForCount,
            message: countMessage
          }
        };
        
      case 'monthly_distribution':
        const monthlyStats = memos.reduce((acc: any, memo: any) => {
          const month = new Date(memo.timestamp).toISOString().substring(0, 7);
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});
        
        return {
          success: true,
          data: {
            monthlyDistribution: monthlyStats,
            message: '월별 메모 분포를 조회했습니다.'
          }
        };
        
      case 'recent_activity':
        const recentMemos = memos
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);
        
        let activityMessage = `최근 ${recentMemos.length}개의 메모입니다:\n\n`;
        recentMemos.forEach((memo: any, index: number) => {
          const date = new Date(memo.timestamp).toLocaleString('ko-KR');
          activityMessage += `${index + 1}. [${date}]\n${memo.content}\n`;
          if (index < recentMemos.length - 1) {
            activityMessage += '\n';
          }
        });
          
        return {
          success: true,
          data: {
            recentMemos: recentMemos.map((memo: any) => ({
              id: memo.id,
              content: memo.content,
              timestamp: memo.timestamp,
              formattedDate: new Date(memo.timestamp).toLocaleString('ko-KR')
            })),
            message: activityMessage
          }
        };
        
      default:
        return {
          success: false,
          message: '지원하지 않는 통계 유형입니다.'
        };
    }
  } catch (error) {
    return {
      success: false,
      message: '메모 통계 조회 중 오류가 발생했습니다.'
    };
  }
};

const generateSummary = async (args: any, roomId?: string) => {
  try {
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const activeMemos = await AsyncStorage.getItem(memosKey);
    const memos = activeMemos ? JSON.parse(activeMemos) : [];
    
    let filteredMemos = memos;
    
    if (args.keyword) {
      filteredMemos = filteredMemos.filter((memo: any) =>
        memo.content.toLowerCase().includes(args.keyword.toLowerCase())
      );
    }
    
    if (args.date_from || args.date_to || args.month) {
      filteredMemos = filteredMemos.filter((memo: any) => {
        const memoDate = new Date(memo.timestamp);
        
        if (args.month) {
          const monthStr = memoDate.toISOString().substring(0, 7);
          return monthStr === args.month;
        }
        
        if (args.date_from) {
          const fromDate = new Date(args.date_from);
          if (memoDate < fromDate) return false;
        }
        
        if (args.date_to) {
          const toDate = new Date(args.date_to + 'T23:59:59');
          if (memoDate > toDate) return false;
        }
        
        return true;
      });
    }
    
    if (filteredMemos.length === 0) {
      return {
        success: true,
        data: {
          totalMemos: 0,
          summary: '지정된 조건에 해당하는 메모가 없습니다.',
          keyTopics: [],
          timeRange: getTimeRangeText(args)
        },
        message: '조건에 맞는 메모가 없어 요약을 생성할 수 없습니다.'
      };
    }
    
    const keyTopics = extractKeyTopics(filteredMemos);
    const summary = createSummaryText(filteredMemos, args.summary_length || 'brief');
    
    let summaryMessage = `${filteredMemos.length}개 메모의 요약을 생성했습니다.\n\n`;
    summaryMessage += `📊 ${summary}\n\n`;
    
    if (keyTopics.length > 0) {
      summaryMessage += `🏷️ 주요 키워드: ${keyTopics.join(', ')}\n\n`;
    }
    
    if (filteredMemos.length > 0) {
      summaryMessage += `📝 주요 메모들:\n`;
      filteredMemos.slice(0, 5).forEach((memo: any, index: number) => {
        const date = new Date(memo.timestamp).toLocaleString('ko-KR', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit' 
        });
        const preview = memo.content.substring(0, 100) + (memo.content.length > 100 ? '...' : '');
        summaryMessage += `\n${index + 1}. [${date}]\n${preview}\n`;
      });
    }
    
    return {
      success: true,
      data: {
        totalMemos: filteredMemos.length,
        summary: summary,
        keyTopics: keyTopics,
        timeRange: getTimeRangeText(args),
        memos: filteredMemos.slice(0, 5).map((memo: any) => ({
          content: memo.content,
          date: new Date(memo.timestamp).toLocaleString('ko-KR', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit' 
          })
        }))
      },
      message: summaryMessage
    };
  } catch (error) {
    return {
      success: false,
      message: '요약 생성 중 오류가 발생했습니다.'
    };
  }
};

const extractTasks = async (args: any, roomId?: string) => {
  try {
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const activeMemos = await AsyncStorage.getItem(memosKey);
    const memos = activeMemos ? JSON.parse(activeMemos) : [];
    
    let filteredMemos = memos;
    
    if (args.keyword) {
      filteredMemos = filteredMemos.filter((memo: any) =>
        memo.content.toLowerCase().includes(args.keyword.toLowerCase())
      );
    }
    
    if (args.date_from || args.date_to) {
      filteredMemos = filteredMemos.filter((memo: any) => {
        const memoDate = new Date(memo.timestamp);
        
        if (args.date_from) {
          const fromDate = new Date(args.date_from);
          if (memoDate < fromDate) return false;
        }
        
        if (args.date_to) {
          const toDate = new Date(args.date_to + 'T23:59:59');
          if (memoDate > toDate) return false;
        }
        
        return true;
      });
    }
    
    const tasks: any[] = [];
    
    filteredMemos.forEach((memo: any) => {
      const extractedTasks = findTasksInText(memo.content);
      extractedTasks.forEach(task => {
        tasks.push({
          task: task,
          source: memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : ''),
          date: new Date(memo.timestamp).toLocaleDateString('ko-KR'),
          memoId: memo.id
        });
      });
    });
    
    let tasksMessage = `${filteredMemos.length}개 메모에서 ${tasks.length}개의 작업을 발견했습니다.`;
    
    if (tasks.length > 0) {
      tasksMessage += '\n\n✅ 발견된 작업들:\n';
      tasks.forEach((task: any, index: number) => {
        tasksMessage += `\n${index + 1}. ${task.task}`;
        tasksMessage += `\n   📅 ${task.date} | 출처: ${task.source}\n`;
      });
    } else {
      tasksMessage = '작업이나 할 일 항목을 찾을 수 없습니다.';
    }
    
    return {
      success: true,
      data: {
        tasks: tasks,
        totalTasks: tasks.length,
        totalMemos: filteredMemos.length,
        timeRange: getTimeRangeText(args)
      },
      message: tasksMessage
    };
  } catch (error) {
    return {
      success: false,
      message: '작업 추출 중 오류가 발생했습니다.'
    };
  }
};

// Helper functions
const extractKeyTopics = (memos: any[]): string[] => {
  const allText = memos.map(memo => memo.content).join(' ').toLowerCase();
  const words = allText.match(/\b[가-힣]{2,}|[a-zA-Z]{3,}\b/g) || [];
  
  const wordCount: { [key: string]: number } = {};
  words.forEach(word => {
    if (word.length > 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
};

const createSummaryText = (memos: any[], length: string): string => {
  const totalMemos = memos.length;
  const dateRange = {
    oldest: new Date(Math.min(...memos.map(m => new Date(m.timestamp).getTime()))),
    newest: new Date(Math.max(...memos.map(m => new Date(m.timestamp).getTime())))
  };
  
  let summary = `총 ${totalMemos}개의 메모가 있습니다. `;
  
  if (totalMemos > 1) {
    const daysDiff = Math.ceil((dateRange.newest.getTime() - dateRange.oldest.getTime()) / (1000 * 60 * 60 * 24));
    summary += `${dateRange.oldest.toLocaleDateString('ko-KR')}부터 ${dateRange.newest.toLocaleDateString('ko-KR')}까지 ${daysDiff}일 동안 작성되었습니다. `;
  }
  
  if (length === 'detailed' || length === 'comprehensive') {
    const recentMemos = memos.slice(0, Math.min(3, totalMemos));
    summary += '\n\n주요 내용:\n';
    recentMemos.forEach((memo, index) => {
      const preview = memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : '');
      summary += `${index + 1}. ${preview}\n`;
    });
  }
  
  return summary;
};

const getTimeRangeText = (args: any): string => {
  if (args.month) return `${args.month}월`;
  if (args.date_from && args.date_to) return `${args.date_from} ~ ${args.date_to}`;
  if (args.date_from) return `${args.date_from} 이후`;
  if (args.date_to) return `${args.date_to} 이전`;
  return '전체 기간';
};

const findTasksInText = (text: string): string[] => {
  const tasks: string[] = [];
  
  const patterns = [
    /(.{0,20})(해야\s*(?:할|하는)\s*(?:일|것|거))(.{0,30})/gi,
    /(.{0,20})(\w+하기)(.{0,30})/gi,
    /(todo\s*:?\s*)(.+?)(?=\n|$)/gi,
    /(.{0,20})(해봐야겠다|해야겠다|하자)(.{0,20})/gi,
    /([※-]\s*)(.+?)(?=\n|$)/gi,
    /(\d+\.\s*)(.+?)(?=\n|$)/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let task = '';
      if (match[2] && match[2].trim()) {
        task = match[0].trim();
      }
      
      if (task && task.length > 3 && task.length < 100) {
        const cleanTask = task
          .replace(/^\d+\.\s*/, '')
          .replace(/^[※-]\s*/, '')
          .replace(/^todo\s*:?\s*/gi, '')
          .trim();
        
        if (cleanTask && !tasks.some(existing => existing.includes(cleanTask) || cleanTask.includes(existing))) {
          tasks.push(cleanTask);
        }
      }
    }
  });
  
  return tasks.slice(0, 10);
};

// 새로운 메모 생성 미리보기
const createMemoPreview = async (args: any, roomId?: string) => {
  try {
    const { content, tags = [] } = args;
    
    return {
      success: true,
      requiresApproval: true,
      actionType: 'create',
      data: {
        preview: {
          content: content,
          tags: tags,
          timestamp: new Date().toISOString(),
          formattedDate: new Date().toLocaleString('ko-KR')
        }
      },
      message: '새 메모 생성을 위한 승인이 필요합니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: '메모 생성 미리보기 중 오류가 발생했습니다.'
    };
  }
};

// 메모 수정 미리보기
const updateMemoPreview = async (args: any, roomId?: string) => {
  try {
    const { memo_id, new_content } = args;
    
    // 기존 메모 찾기
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const activeMemos = await AsyncStorage.getItem(memosKey);
    const memos = activeMemos ? JSON.parse(activeMemos) : [];
    
    const targetMemo = memos.find((memo: any) => memo.id === memo_id);
    
    if (!targetMemo) {
      return {
        success: false,
        message: '수정할 메모를 찾을 수 없습니다.'
      };
    }
    
    return {
      success: true,
      requiresApproval: true,
      actionType: 'update',
      data: {
        preview: {
          memoId: memo_id,
          originalContent: targetMemo.content,
          newContent: new_content,
          timestamp: targetMemo.timestamp,
          formattedDate: new Date(targetMemo.timestamp).toLocaleString('ko-KR')
        }
      },
      message: '메모 수정을 위한 승인이 필요합니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: '메모 수정 미리보기 중 오류가 발생했습니다.'
    };
  }
};

// 메모 삭제 미리보기
const deleteMemoPreview = async (args: any, roomId?: string) => {
  try {
    const { memo_id } = args;
    
    // 기존 메모 찾기
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const activeMemos = await AsyncStorage.getItem(memosKey);
    const memos = activeMemos ? JSON.parse(activeMemos) : [];
    
    const targetMemo = memos.find((memo: any) => memo.id === memo_id);
    
    if (!targetMemo) {
      return {
        success: false,
        message: '삭제할 메모를 찾을 수 없습니다.'
      };
    }
    
    return {
      success: true,
      requiresApproval: true,
      actionType: 'delete',
      data: {
        preview: {
          memoId: memo_id,
          content: targetMemo.content,
          timestamp: targetMemo.timestamp,
          formattedDate: new Date(targetMemo.timestamp).toLocaleString('ko-KR')
        }
      },
      message: '메모 삭제를 위한 승인이 필요합니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: '메모 삭제 미리보기 중 오류가 발생했습니다.'
    };
  }
};

// 실제 메모 생성 실행
export const executeCreateMemo = async (args: any, roomId?: string) => {
  try {
    const { content, tags = [] } = args;
    
    const newMemo = {
      id: Date.now().toString(),
      content: content,
      timestamp: new Date(),
      tags: tags
    };
    
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const existingMemos = await AsyncStorage.getItem(memosKey);
    const memos = existingMemos ? JSON.parse(existingMemos) : [];
    
    memos.unshift(newMemo);
    await AsyncStorage.setItem(memosKey, JSON.stringify(memos));
    
    return {
      success: true,
      data: {
        memo: {
          id: newMemo.id,
          content: newMemo.content,
          timestamp: newMemo.timestamp,
          formattedDate: new Date(newMemo.timestamp).toLocaleString('ko-KR'),
          tags: newMemo.tags
        }
      },
      message: '새 메모가 성공적으로 생성되었습니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: '메모 생성 중 오류가 발생했습니다.'
    };
  }
};

// 실제 메모 수정 실행
export const executeUpdateMemo = async (args: any, roomId?: string) => {
  try {
    const { memo_id, new_content } = args;
    
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const existingMemos = await AsyncStorage.getItem(memosKey);
    const memos = existingMemos ? JSON.parse(existingMemos) : [];
    
    const memoIndex = memos.findIndex((memo: any) => memo.id === memo_id);
    
    if (memoIndex === -1) {
      return {
        success: false,
        message: '수정할 메모를 찾을 수 없습니다.'
      };
    }
    
    const originalContent = memos[memoIndex].content;
    memos[memoIndex].content = new_content;
    memos[memoIndex].updatedAt = new Date();
    
    await AsyncStorage.setItem(memosKey, JSON.stringify(memos));
    
    return {
      success: true,
      data: {
        memo: {
          id: memo_id,
          originalContent: originalContent,
          newContent: new_content,
          timestamp: memos[memoIndex].timestamp,
          updatedAt: memos[memoIndex].updatedAt,
          formattedDate: new Date(memos[memoIndex].updatedAt).toLocaleString('ko-KR')
        }
      },
      message: '메모가 성공적으로 수정되었습니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: '메모 수정 중 오류가 발생했습니다.'
    };
  }
};

// 실제 메모 삭제 실행
export const executeDeleteMemo = async (args: any, roomId?: string) => {
  try {
    const { memo_id } = args;
    
    const memosKey = roomId ? `memos_${roomId}` : 'memos';
    const existingMemos = await AsyncStorage.getItem(memosKey);
    const memos = existingMemos ? JSON.parse(existingMemos) : [];
    
    const memoIndex = memos.findIndex((memo: any) => memo.id === memo_id);
    
    if (memoIndex === -1) {
      return {
        success: false,
        message: '삭제할 메모를 찾을 수 없습니다.'
      };
    }
    
    const deletedMemo = memos[memoIndex];
    memos.splice(memoIndex, 1);
    
    await AsyncStorage.setItem(memosKey, JSON.stringify(memos));
    
    return {
      success: true,
      data: {
        deletedMemo: {
          id: memo_id,
          content: deletedMemo.content,
          timestamp: deletedMemo.timestamp,
          formattedDate: new Date(deletedMemo.timestamp).toLocaleString('ko-KR')
        }
      },
      message: '메모가 성공적으로 삭제되었습니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: '메모 삭제 중 오류가 발생했습니다.'
    };
  }
};