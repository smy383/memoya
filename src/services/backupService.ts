import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

export interface BackupData {
  version: string;
  timestamp: string;
  data: Record<string, any>;
}

export const BACKUP_VERSION = '1.0.0';

const BACKUP_FILE_PATH = `${RNFS.DocumentDirectoryPath}/memoya-backup.json`;

/**
 * 모든 AsyncStorage 데이터를 백업하여 내부 파일로 저장
 */
export const createBackup = async (): Promise<void> => {
  try {
    console.log('Starting backup process...');
    
    // 모든 AsyncStorage 키와 데이터 가져오기
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Found keys:', allKeys.length);
    
    const allData = await AsyncStorage.multiGet(allKeys);
    console.log('Retrieved data for keys:', allData.length);
    
    // 백업 데이터 구조 생성
    const backupData: BackupData = {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      data: {}
    };

    // 데이터를 백업 객체에 저장
    allData.forEach(([key, value]) => {
      if (value !== null) {
        try {
          backupData.data[key] = JSON.parse(value);
        } catch (error) {
          // JSON 파싱이 안 되는 값은 문자열 그대로 저장
          backupData.data[key] = value;
        }
      }
    });

    console.log('Backup data prepared with', Object.keys(backupData.data).length, 'keys');
    
    // 내부 파일로 저장
    const backupJson = JSON.stringify(backupData, null, 2);
    await RNFS.writeFile(BACKUP_FILE_PATH, backupJson, 'utf8');
    
    console.log('Backup saved to:', BACKUP_FILE_PATH);
    
    // 파일이 실제로 생성되었는지 확인
    const fileExists = await RNFS.exists(BACKUP_FILE_PATH);
    if (!fileExists) {
      throw new Error('백업 파일 저장에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new Error(`백업 생성 중 오류가 발생했습니다: ${error.message}`);
  }
};

/**
 * 저장된 백업의 기본 정보 가져오기
 */
export const getBackupInfo = async (): Promise<{ exists: boolean; timestamp?: string; dataCount?: number; chatRoomsCount?: number; memosCount?: number } | null> => {
  try {
    const fileExists = await RNFS.exists(BACKUP_FILE_PATH);
    
    if (!fileExists) {
      return { exists: false };
    }
    
    const backupContent = await RNFS.readFile(BACKUP_FILE_PATH, 'utf8');
    const backupData: BackupData = JSON.parse(backupContent);
    
    let totalMemos = 0;
    let chatRoomsCount = 0;
    
    // 채팅방 개수 계산
    if (backupData.data.chatRooms && Array.isArray(backupData.data.chatRooms)) {
      chatRoomsCount = backupData.data.chatRooms.length;
    }
    
    // 메모 개수 계산 (모든 memos 키 확인)
    Object.keys(backupData.data).forEach(key => {
      if (key.startsWith('memos') && Array.isArray(backupData.data[key])) {
        totalMemos += backupData.data[key].length;
      }
    });
    
    return {
      exists: true,
      timestamp: new Date(backupData.timestamp).toLocaleString(),
      dataCount: Object.keys(backupData.data).length,
      chatRoomsCount,
      memosCount: totalMemos
    };
    
  } catch (error) {
    console.error('Error getting backup info:', error);
    return { exists: false };
  }
};

/**
 * 내부 백업에서 데이터 복구
 */
export const restoreFromInternalBackup = async (): Promise<void> => {
  try {
    const fileExists = await RNFS.exists(BACKUP_FILE_PATH);
    
    if (!fileExists) {
      throw new Error('저장된 백업이 없습니다. 먼저 백업을 만들어주세요.');
    }
    
    const backupContent = await RNFS.readFile(BACKUP_FILE_PATH, 'utf8');
    const backupData: BackupData = JSON.parse(backupContent);
    
    // 백업 데이터 검증
    if (!backupData.version || !backupData.timestamp || !backupData.data) {
      throw new Error('올바르지 않은 백업 데이터 형식입니다.');
    }
    
    // 백업 데이터를 AsyncStorage로 복구
    await restoreFromBackup(backupData);
    
    console.log('Successfully restored from internal backup');
    
  } catch (error) {
    console.error('Error restoring from internal backup:', error);
    if (error.message.includes('저장된 백업이 없습니다') || error.message.includes('올바르지 않은')) {
      throw error;
    }
    throw new Error('백업 복구 중 오류가 발생했습니다.');
  }
};

/**
 * 백업 파일을 Downloads 폴더로 내보내기
 */
export const exportBackupToFile = async (): Promise<string> => {
  try {
    const fileExists = await RNFS.exists(BACKUP_FILE_PATH);
    
    if (!fileExists) {
      throw new Error('내보낼 백업이 없습니다. 먼저 백업을 만들어주세요.');
    }
    
    const backupContent = await RNFS.readFile(BACKUP_FILE_PATH, 'utf8');
    
    // Downloads 폴더에 날짜와 시간이 포함된 파일명으로 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const exportFileName = `memoya-backup-${timestamp}.json`;
    const exportFilePath = `${RNFS.DownloadDirectoryPath}/${exportFileName}`;
    
    console.log('Exporting backup to:', exportFilePath);
    
    await RNFS.writeFile(exportFilePath, backupContent, 'utf8');
    
    // 파일이 실제로 생성되었는지 확인
    const exportedFileExists = await RNFS.exists(exportFilePath);
    if (!exportedFileExists) {
      throw new Error('백업 파일 내보내기에 실패했습니다.');
    }
    
    console.log('Backup exported to Downloads folder successfully');
    return exportFilePath;
    
  } catch (error) {
    console.error('Error exporting backup to file:', error);
    if (error.message.includes('내보낼 백업이 없습니다') || error.message.includes('백업 파일 내보내기에 실패')) {
      throw error;
    }
    throw new Error('백업 파일 내보내기 중 오류가 발생했습니다.');
  }
};

/**
 * 백업 데이터를 AsyncStorage로 복원
 */
export const restoreFromBackup = async (backupData: BackupData): Promise<void> => {
  try {
    // 기존 데이터 삭제
    await AsyncStorage.clear();

    // 백업 데이터를 AsyncStorage에 복원
    const entries: [string, string][] = [];
    
    for (const [key, value] of Object.entries(backupData.data)) {
      if (value !== null && value !== undefined) {
        entries.push([key, typeof value === 'string' ? value : JSON.stringify(value)]);
      }
    }

    await AsyncStorage.multiSet(entries);
    console.log(`Restored ${entries.length} keys from backup`);
  } catch (error) {
    console.error('Error restoring from backup:', error);
    throw new Error('백업 복원 중 오류가 발생했습니다.');
  }
};

/**
 * Downloads 폴더에서 백업 파일 목록 가져오기
 */
export const getDownloadBackupFiles = async (): Promise<string[]> => {
  try {
    const downloadPath = RNFS.DownloadDirectoryPath;
    const files = await RNFS.readDir(downloadPath);
    
    // memoya-backup으로 시작하고 .json으로 끝나는 파일들만 필터링
    const backupFiles = files
      .filter(file => 
        file.name.startsWith('memoya-backup') && 
        file.name.endsWith('.json') && 
        file.isFile()
      )
      .map(file => file.path)
      .sort((a, b) => b.localeCompare(a)); // 최신 파일이 먼저 오도록 정렬
    
    console.log('Found backup files:', backupFiles.length);
    return backupFiles;
    
  } catch (error) {
    console.error('Error getting download backup files:', error);
    return [];
  }
};

/**
 * 파일에서 백업 데이터를 가져와서 복구
 */
export const restoreFromFile = async (filePath: string): Promise<void> => {
  try {
    const fileExists = await RNFS.exists(filePath);
    
    if (!fileExists) {
      throw new Error('선택한 백업 파일을 찾을 수 없습니다.');
    }
    
    const backupContent = await RNFS.readFile(filePath, 'utf8');
    const backupData: BackupData = JSON.parse(backupContent);
    
    // 백업 데이터 검증
    if (!backupData.version || !backupData.timestamp || !backupData.data) {
      throw new Error('올바르지 않은 백업 파일 형식입니다.');
    }
    
    // 백업 데이터를 AsyncStorage로 복구
    await restoreFromBackup(backupData);
    
    console.log('Successfully restored from file backup');
    
  } catch (error) {
    console.error('Error restoring from file:', error);
    if (error.message.includes('선택한 백업 파일') || error.message.includes('올바르지 않은')) {
      throw error;
    }
    throw new Error('파일 복구 중 오류가 발생했습니다.');
  }
};

