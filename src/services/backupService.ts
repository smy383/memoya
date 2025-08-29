import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import { DocumentPickerResponse, pick, types } from '@react-native-documents/picker';

export interface BackupData {
  version: string;
  timestamp: string;
  data: Record<string, any>;
}

export const BACKUP_VERSION = '1.0.0';

const INTERNAL_BACKUP_KEY = 'internal_backup_data';

/**
 * 모든 AsyncStorage 데이터를 백업하여 AsyncStorage에 저장
 */
export const createBackup = async (): Promise<void> => {
  try {
    console.log('Starting backup process...');
    
    // 모든 AsyncStorage 키와 데이터 가져오기 (백업 키 제외)
    const allKeys = await AsyncStorage.getAllKeys();
    const filteredKeys = allKeys.filter(key => key !== INTERNAL_BACKUP_KEY);
    console.log('Found keys:', filteredKeys.length);
    
    const allData = await AsyncStorage.multiGet(filteredKeys);
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
    
    // AsyncStorage에 백업 데이터 저장
    await AsyncStorage.setItem(INTERNAL_BACKUP_KEY, JSON.stringify(backupData));
    
    console.log('Backup saved to AsyncStorage');
    
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
    const backupContent = await AsyncStorage.getItem(INTERNAL_BACKUP_KEY);
    
    if (!backupContent) {
      return { exists: false };
    }
    
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
    const backupContent = await AsyncStorage.getItem(INTERNAL_BACKUP_KEY);
    
    if (!backupContent) {
      throw new Error('저장된 백업이 없습니다. 먼저 백업을 만들어주세요.');
    }
    
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
 * 백업 데이터를 텍스트로 공유 (Share API 사용)
 */
export const exportBackupToFile = async (): Promise<string> => {
  try {
    const backupContent = await AsyncStorage.getItem(INTERNAL_BACKUP_KEY);
    
    if (!backupContent) {
      throw new Error('내보낼 백업이 없습니다. 먼저 백업을 만들어주세요.');
    }
    
    // 타임스탬프로 파일 이름 생성
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const exportFileName = `memoya-backup-${timestamp}.json`;
    
    // Share API를 사용해서 순수 JSON 데이터만 공유
    const shareOptions = {
      title: `${exportFileName}`,
      message: backupContent, // 순수 JSON 데이터만
      subject: `Memoya 백업 - ${exportFileName}`,
      failOnCancel: false,
    };
    
    try {
      const result = await Share.open(shareOptions);
      console.log('Share result:', result);
      
      return exportFileName;
    } catch (shareError) {
      if (shareError.message && shareError.message.includes('cancelled')) {
        throw new Error('백업 내보내기가 취소되었습니다.');
      }
      throw new Error('백업 데이터 공유 중 오류가 발생했습니다.');
    }
    
  } catch (error) {
    console.error('Error exporting backup:', error);
    if (error.message.includes('내보낼 백업이 없습니다') || 
        error.message.includes('백업 내보내기가 취소') ||
        error.message.includes('백업 데이터 공유 중')) {
      throw error;
    }
    throw new Error('백업 데이터 내보내기 중 오류가 발생했습니다.');
  }
};

/**
 * 백업 데이터를 AsyncStorage로 복원
 */
export const restoreFromBackup = async (backupData: BackupData): Promise<void> => {
  try {
    // 현재 백업 데이터 보존
    const currentBackup = await AsyncStorage.getItem(INTERNAL_BACKUP_KEY);
    
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
    
    // 백업 데이터 다시 저장
    if (currentBackup) {
      await AsyncStorage.setItem(INTERNAL_BACKUP_KEY, currentBackup);
    }
    
    console.log(`Restored ${entries.length} keys from backup`);
  } catch (error) {
    console.error('Error restoring from backup:', error);
    throw new Error('백업 복원 중 오류가 발생했습니다.');
  }
};

/**
 * 텍스트에서 백업 데이터를 파싱하여 복구
 */
export const restoreFromBackupText = async (backupText: string): Promise<void> => {
  try {
    const backupData: BackupData = JSON.parse(backupText);
    
    // 백업 데이터 검증
    if (!backupData.version || !backupData.timestamp || !backupData.data) {
      throw new Error('올바르지 않은 백업 데이터 형식입니다.');
    }
    
    // 백업 데이터를 AsyncStorage로 복구
    await restoreFromBackup(backupData);
    
    console.log('Successfully restored from backup text');
    
  } catch (error) {
    console.error('Error restoring from backup text:', error);
    if (error.message.includes('올바르지 않은')) {
      throw error;
    }
    throw new Error('백업 텍스트 복구 중 오류가 발생했습니다.');
  }
};

/**
 * 문서 선택기를 사용해서 백업 파일 선택 및 복구
 */
export const pickAndRestoreBackupFile = async (): Promise<void> => {
  try {
    const result = await pick({
      type: [types.allFiles], // 모든 파일 타입 허용
      copyToCacheDirectory: true,
    });

    if (!result || result.length === 0) {
      throw new Error('파일이 선택되지 않았습니다.');
    }

    const file = result[0];
    console.log('Selected file:', file.name, file.type, file.uri);
    
    // 파일 내용 읽기 (간단한 방법부터 시도)
    let backupText: string;
    try {
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      backupText = await response.text();
      
      if (!backupText || backupText.trim() === '') {
        throw new Error('파일이 비어있거나 읽을 수 없습니다.');
      }
    } catch (error) {
      console.error('File read error:', error);
      throw new Error(`파일을 읽을 수 없습니다: ${error.message}`);
    }
    
    console.log('File content preview:', backupText.substring(0, 200));
    
    // JSON 형식 검증
    let parsedData: any;
    try {
      parsedData = JSON.parse(backupText);
      console.log('JSON parsed successfully, keys:', Object.keys(parsedData));
    } catch (error) {
      console.error('JSON parse error:', error);
      throw new Error('선택한 파일이 올바른 JSON 형식이 아닙니다.');
    }
    
    // 백업 데이터 형식 검증
    if (!parsedData.version || !parsedData.timestamp || !parsedData.data) {
      throw new Error('올바른 백업 파일 형식이 아닙니다. version, timestamp, data 필드가 필요합니다.');
    }
    
    console.log('Starting backup restoration...');
    // 백업 데이터 복구
    try {
      await restoreFromBackupText(backupText);
      console.log('Backup restoration completed successfully');
    } catch (restoreError) {
      console.error('Backup restoration error:', restoreError);
      throw new Error(`백업 복원 중 오류: ${restoreError.message}`);
    }
    
  } catch (error) {
    if (error.code === 'DOCUMENT_PICKER_CANCELED') {
      throw new Error('파일 선택이 취소되었습니다.');
    }
    console.error('Error picking and restoring backup file:', error);
    throw new Error('백업 파일 선택 및 복구 중 오류가 발생했습니다.');
  }
};

/**
 * 파일 경로에서 복구 - 더 이상 지원하지 않음
 */
export const restoreFromFile = async (filePath: string): Promise<void> => {
  throw new Error('파일 경로에서 복구 기능은 보안상 제거되었습니다. 백업 텍스트를 직접 입력하여 복구하세요.');
};

/**
 * Share에서 가져온 파일 URI 복구 - 더 이상 지원하지 않음
 */
export const importBackupFromShare = async (fileUri: string): Promise<void> => {
  throw new Error('파일에서 복구 기능은 보안상 제거되었습니다. 백업 텍스트를 직접 입력하여 복구하세요.');
};