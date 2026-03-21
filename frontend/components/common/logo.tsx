import Logo from '@/public/logo.webp';
import LogoDark from '@/public/logo_dark.webp';
import Image from 'next/image';
import Link from 'next/link';
import styles from './logo.module.css';

type LogoProps = {
    width?: number;
    height?: number;
    className?: string;
};

export default function LogoComponent({ width = 200, height = 55, className = '' }: LogoProps) {
    return (
      <Link href="/">
        <div className={`${styles.logoWrapper} ${className}`} style={{ width, height }}>
            <Image 
                src={Logo} 
                alt="WriterPro" 
                width={width} 
                height={height} 
                className={styles.logoLight} 
                style={{ width: '100%', height: 'auto' }}
            />
            <Image 
                src={LogoDark} 
                alt="WriterPro" 
                width={width} 
                height={height} 
                className={styles.logoDark} 
                style={{ width: '100%', height: 'auto' }}
            />
        </div>
      </Link>
    )
}
