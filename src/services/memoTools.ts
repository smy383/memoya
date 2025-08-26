import AsyncStorage from '@react-native-async-storage/async-storage';

export const getMemoTools = () => {
  return [
    {
      name: "search_memos",
      description: "사용자의 메모를 다양한 조건으로 검색합니다. 날짜별, 키워드별, 기간별 검색이 가능합니다.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "검색할 키워드 (선택사항). 메모 내용에서 해당 키워드를 포함한 메모를 찾습니다."
          },
          date_from: {
            type: "string", 
            description: "검색 시작 날짜 (YYYY-MM-DD 형식, 선택사항)"
          },
          date_to: {
            type: "string",
            description: "검색 종료 날짜 (YYYY-MM-DD 형식, 선택사항)"
          },
          month: {
            type: "string",
            description: "특정 월 검색 (YYYY-MM 형식, 선택사항). 예: '2025-08'"
          },
          limit: {
            type: "number",
            description: "반환할 최대 메모 개수 (기본값: 10)"
          }
        }
      }
    },
    {
      name: "get_memo_stats",
      description: "사용자의 메모 통계 정보를 가져옵니다. 전체 메모 개수, 날짜별 분포 등의 정보를 제공합니다.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "통계 유형 (total_count, monthly_distribution, recent_activity 중 하나)",
            enum: ["total_count", "monthly_distribution", "recent_activity"]
          }
        },
        required: ["type"]
      }
    },
    {
      name: "generate_summary",
      description: "사용자의 메모들을 요약합니다. 특정 기간이나 키워드로 필터링된 메모들의 핵심 내용을 추출하여 간결한 요약을 생성합니다.",
      parameters: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: "요약할 메모의 시작 날짜 (YYYY-MM-DD, 선택사항)"
          },
          date_to: {
            type: "string", 
            description: "요약할 메모의 종료 날짜 (YYYY-MM-DD, 선택사항)"
          },
          month: {
            type: "string",
            description: "특정 월 요약 (YYYY-MM 형식, 선택사항). 예: '2025-08'"
          },
          keyword: {
            type: "string",
            description: "특정 키워드와 관련된 메모만 요약 (선택사항)"
          },
          summary_length: {
            type: "string",
            description: "요약 길이 설정",
            enum: ["brief", "detailed", "comprehensive"]
          }
        }
      }
    },
    {
      name: "extract_tasks",
      description: "사용자의 메모에서 할일이나 작업 항목을 추출합니다. '해야 할 일', '하기', 'TODO' 등의 패턴을 인식하여 액션 아이템을 찾아냅니다.",
      parameters: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: "작업을 추출할 메모의 시작 날짜 (YYYY-MM-DD, 선택사항)"
          },
          date_to: {
            type: "string",
            description: "작업을 추출할 메모의 종료 날짜 (YYYY-MM-DD, 선택사항)"
          },
          keyword: {
            type: "string",
            description: "특정 키워드와 관련된 작업만 추출 (선택사항)"
          }
        }
      }
    }
  ];
};

export const executeMemoTool = async (functionName: string, args: any, roomId?: string) => {
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
    
    return {
      success: true,
      data: filteredMemos.map((memo: any) => ({
        id: memo.id,
        content: memo.content,
        timestamp: memo.timestamp,
        formattedDate: new Date(memo.timestamp).toLocaleString('ko-KR')
      })),
      message: `${filteredMemos.length}개의 메모를 찾았습니다.`
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
        return {
          success: true,
          data: {
            totalCount: memos.length,
            message: `총 ${memos.length}개의 메모가 있습니다.`
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
          
        return {
          success: true,
          data: {
            recentMemos: recentMemos.map((memo: any) => ({
              id: memo.id,
              content: memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : ''),
              timestamp: memo.timestamp,
              formattedDate: new Date(memo.timestamp).toLocaleString('ko-KR')
            })),
            message: `최근 ${recentMemos.length}개의 메모입니다.`
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
    
    return {
      success: true,
      data: {
        totalMemos: filteredMemos.length,
        summary: summary,
        keyTopics: keyTopics,
        timeRange: getTimeRangeText(args),
        memos: filteredMemos.slice(0, 5).map((memo: any) => ({
          content: memo.content.substring(0, 100) + (memo.content.length > 100 ? '...' : ''),
          date: new Date(memo.timestamp).toLocaleString('ko-KR', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit' 
          })
        }))
      },
      message: `${filteredMemos.length}개 메모의 요약을 생성했습니다.`
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
    
    return {
      success: true,
      data: {
        tasks: tasks,
        totalTasks: tasks.length,
        totalMemos: filteredMemos.length,
        timeRange: getTimeRangeText(args)
      },
      message: `${filteredMemos.length}개 메모에서 ${tasks.length}개의 작업을 발견했습니다.`
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