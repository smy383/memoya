import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export interface BackupData {
  version: string;
  timestamp: string;
  data: Record<string, any>;
}

export const BACKUP_VERSION = '1.0.0';

/**
 * 모든 AsyncStorage 데이터를 백업 파일로 생성
 */
export const createBackup = async (): Promise<string> => {
  try {
    // 모든 AsyncStorage 키와 데이터 가져오기
    const allKeys = await AsyncStorage.getAllKeys();
    const allData = await AsyncStorage.multiGet(allKeys);
    
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

    // 백업 파일명 생성 (날짜 포함)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `memoya-backup-${timestamp}.json`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    // 파일로 저장
    await RNFS.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log('Backup created:', filePath);
    return filePath;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new Error('백업 생성 중 오류가 발생했습니다.');
  }
};

/**
 * 백업 파일을 외부로 공유
 */
export const shareBackupFile = async (filePath: string): Promise<void> => {
  try {
    const shareOptions = {
      title: 'MemoYa 백업 파일',
      message: 'MemoYa 앱의 데이터 백업 파일입니다.',
      url: `file://${filePath}`,
      type: 'application/json',
    };

    await Share.open(shareOptions);
  } catch (error) {
    console.error('Error sharing backup file:', error);
    if (error.message !== 'User did not share') {
      throw new Error('백업 파일 공유 중 오류가 발생했습니다.');
    }
  }
};

/**
 * 백업 파일을 선택하여 가져오기 (간단한 텍스트 입력 방식)
 */
export const pickBackupFile = async (): Promise<string | null> => {
  // 현재는 Document Picker 없이 구현
  // 사용자가 백업 파일 경로를 직접 입력하거나 
  // 다른 방식으로 파일을 가져올 수 있음
  throw new Error('파일 선택 기능은 현재 개발 중입니다. 백업 생성 기능을 사용해주세요.');
};

/**
 * 백업 파일의 내용을 검증하고 파싱
 */
export const validateBackupFile = async (filePath: string): Promise<BackupData> => {
  try {
    const fileContent = await RNFS.readFile(filePath, 'utf8');
    const backupData: BackupData = JSON.parse(fileContent);

    // 백업 파일 구조 검증
    if (!backupData.version || !backupData.timestamp || !backupData.data) {
      throw new Error('올바르지 않은 백업 파일 형식입니다.');
    }

    // 버전 호환성 검사 (필요에 따라 확장 가능)
    if (backupData.version !== BACKUP_VERSION) {
      console.warn(`Backup version mismatch: ${backupData.version} vs ${BACKUP_VERSION}`);
    }

    return backupData;
  } catch (error) {
    console.error('Error validating backup file:', error);
    if (error.message.includes('올바르지 않은')) {
      throw error;
    }
    throw new Error('백업 파일을 읽을 수 없습니다.');
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
 * 백업 파일 정보 추출
 */
export const getBackupInfo = (backupData: BackupData): { 
  version: string;
  timestamp: string;
  dataCount: number;
  chatRoomsCount: number;
  memosCount: number;
} => {
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
    version: backupData.version,
    timestamp: new Date(backupData.timestamp).toLocaleString(),
    dataCount: Object.keys(backupData.data).length,
    chatRoomsCount,
    memosCount: totalMemos
  };
};