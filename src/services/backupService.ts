import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

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
 * 백업 파일을 공유하여 사용자가 원하는 앱/위치로 저장 (Share API 사용)
 */
export const exportBackupToFile = async (): Promise<string> => {
  try {
    const fileExists = await RNFS.exists(BACKUP_FILE_PATH);
    
    if (!fileExists) {
      throw new Error('내보낼 백업이 없습니다. 먼저 백업을 만들어주세요.');
    }
    
    const backupContent = await RNFS.readFile(BACKUP_FILE_PATH, 'utf8');
    
    // 임시 파일로 백업 생성
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const exportFileName = `memoya-backup-${timestamp}.json`;
    const tempFilePath = `${RNFS.CachesDirectoryPath}/${exportFileName}`;
    
    await RNFS.writeFile(tempFilePath, backupContent, 'utf8');
    
    // Share API를 사용해서 파일 공유
    const shareOptions = {
      title: 'Memoya 백업 파일',
      message: 'Memoya 앱의 백업 파일입니다.',
      url: `file://${tempFilePath}`,
      type: 'application/json',
      filename: exportFileName,
      failOnCancel: false,
    };
    
    try {
      const result = await Share.open(shareOptions);
      console.log('Share result:', result);
      
      // 임시 파일 정리
      setTimeout(async () => {
        try {
          const exists = await RNFS.exists(tempFilePath);
          if (exists) {
            await RNFS.unlink(tempFilePath);
          }
        } catch (cleanupError) {
          console.log('Cleanup error (non-critical):', cleanupError);
        }
      }, 5000); // 5초 후 정리
      
      return exportFileName;
    } catch (shareError) {
      // 임시 파일 정리
      try {
        const exists = await RNFS.exists(tempFilePath);
        if (exists) {
          await RNFS.unlink(tempFilePath);
        }
      } catch (cleanupError) {
        console.log('Cleanup error (non-critical):', cleanupError);
      }
      
      if (shareError.message && shareError.message.includes('cancelled')) {
        throw new Error('백업 내보내기가 취소되었습니다.');
      }
      throw new Error('백업 파일 공유 중 오류가 발생했습니다.');
    }
    
  } catch (error) {
    console.error('Error exporting backup to file:', error);
    if (error.message.includes('내보낼 백업이 없습니다') || 
        error.message.includes('백업 내보내기가 취소') ||
        error.message.includes('백업 파일 공유 중')) {
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
 * 백업 복구는 사용자가 직접 백업 파일을 공유해서 앱으로 가져오는 방식 사용
 * (Android Intent 또는 iOS Share Extension을 통해)
 * 현재는 내부 백업만 지원하도록 단순화
 */
export const importBackupFromShare = async (fileUri: string): Promise<void> => {
  try {
    const fileExists = await RNFS.exists(fileUri);
    
    if (!fileExists) {
      throw new Error('선택한 백업 파일을 찾을 수 없습니다.');
    }
    
    const backupContent = await RNFS.readFile(fileUri, 'utf8');
    const backupData: BackupData = JSON.parse(backupContent);
    
    // 백업 데이터 검증
    if (!backupData.version || !backupData.timestamp || !backupData.data) {
      throw new Error('올바르지 않은 백업 파일 형식입니다.');
    }
    
    // 백업 데이터를 AsyncStorage로 복구
    await restoreFromBackup(backupData);
    
    console.log('Successfully imported backup from shared file');
    
  } catch (error) {
    console.error('Error importing backup from share:', error);
    if (error.message.includes('선택한 백업 파일') || 
        error.message.includes('올바르지 않은')) {
      throw error;
    }
    throw new Error('백업 파일 가져오기 중 오류가 발생했습니다.');
  }
};

/**
 * 현재는 내부 백업만 지원 - 외부 파일 복구는 추후 구현
 */
export const restoreFromSelectedFile = async (): Promise<void> => {
  throw new Error('외부 파일에서 복구 기능은 현재 개발 중입니다. 내부 백업에서 복구를 사용해주세요.');
};

/**
 * 파일에서 백업 데이터를 가져와서 복구 (기존 함수 - 호환성 유지)
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

