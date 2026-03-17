import axios from 'axios';

export function buildNexusTarballUrl(packageName: string, version: string, nexusUrl: string): string {
  const shortName = packageName.startsWith('@') ? packageName.split('/')[1] : packageName;
  return `${nexusUrl}/${packageName}/-/${shortName}-${version}.tgz`;
}

export async function checkNexusAvailability(url: string): Promise<number> {
  try {
    const response = await axios.head(url);
    return response.status;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number } };
    return axiosError.response?.status ?? 0;
  }
}
