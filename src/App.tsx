import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { Terminal, Code, Cpu, Globe, Mail, ChevronDown, ExternalLink, Github, Linkedin, MapPin, Database, Layout, Layers, ArrowRight, Briefcase, Award, Zap, Plus, Minus, TerminalSquare, MousePointer2, MessageSquareQuote } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Interactive Components ---

const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Disable custom cursor on touch devices for better mobile experience
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsMobile(true);
      return;
    }

    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = 
        target.tagName.toLowerCase() === 'a' || 
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') || 
        target.closest('button') ||
        target.closest('.interactive');
        
      setIsHovering(!!isInteractive);
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);
    
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (isMobile) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-neon-cyan rounded-full pointer-events-none z-[100] mix-blend-screen"
        animate={{
          x: mousePosition.x - 6,
          y: mousePosition.y - 6,
          scale: isHovering ? 0 : 1,
        }}
        transition={{ type: 'tween', ease: 'backOut', duration: 0.1 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-10 h-10 border border-neon-cyan/50 rounded-full pointer-events-none z-[99] flex items-center justify-center mix-blend-screen bg-neon-cyan/5 backdrop-blur-[1px]"
        animate={{
          x: mousePosition.x - 20,
          y: mousePosition.y - 20,
          scale: isHovering ? 1.5 : 1,
          backgroundColor: isHovering ? 'rgba(0, 243, 255, 0.1)' : 'rgba(0, 243, 255, 0.05)',
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.5 }}
      >
        {isHovering && <div className="w-1 h-1 bg-neon-cyan rounded-full" />}
      </motion.div>
    </>
  );
};

const MagneticButton = ({ children, className, onClick, href }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.3, y: middleY * 0.3 });
  };
  
  const reset = () => setPosition({ x: 0, y: 0 });

  const content = (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={cn("relative inline-flex items-center justify-center interactive", className)}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );

  if (href) {
    return <a href={href} className="inline-block">{content}</a>;
  }
  return content;
};

const TiltCard = ({ children, className }: any) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full"
    >
      <motion.div 
        style={{ rotateX, rotateY }} 
        className={cn("glass-panel p-8 rounded-2xl h-full transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(0,243,255,0.15)]", className)}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

const TextReveal = ({ text, className }: { text: string, className?: string }) => {
  const words = text.split(" ");
  return (
    <span className={cn("inline-block", className)}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="inline-block mr-3"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

// --- 3D Components ---

const PixelEarth = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [hovered, setHover] = useState(false);
  const { viewport } = useThree();
  const [positions, setPositions] = useState<THREE.Vector3[]>([]);
  
  const targetColor = useMemo(() => new THREE.Color(), []);
  const baseColor = useMemo(() => new THREE.Color("#00f3ff").multiplyScalar(1.2), []);
  const hoverColor = useMemo(() => new THREE.Color("#00f3ff").multiplyScalar(2.5), []);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    // Using a reliable specular map where land is dark and water is light
    img.src = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 512, 256);
      const data = ctx.getImageData(0, 0, 512, 256).data;

      const newPositions = [];
      // Use lower density on mobile for better performance
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const count = isMobile ? 8000 : 15000; 
      const phi = Math.PI * (3 - Math.sqrt(5));
      
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;

        const u = 0.5 + (Math.atan2(x, z) / (2 * Math.PI));
        const v = 0.5 - (Math.asin(y) / Math.PI);

        const px = Math.max(0, Math.min(511, Math.floor(u * 512)));
        const py = Math.max(0, Math.min(255, Math.floor(v * 256)));
        const idx = (py * 512 + px) * 4;
        
        // Specular map: water is bright (>100), land is dark (<100)
        if (data[idx] < 100) {
          newPositions.push(new THREE.Vector3(x, y, z));
        }
      }
      setPositions(newPositions);
    };

    img.onerror = () => {
      // Fallback if image fails to load
      const newPositions = [];
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const count = isMobile ? 3000 : 5000;
      const phi = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        const noise = Math.sin(x * 5) * Math.cos(y * 5) + Math.sin(z * 5);
        if (noise > -0.3) newPositions.push(new THREE.Vector3(x, y, z));
      }
      setPositions(newPositions);
    };
  }, []);

  useEffect(() => {
    if (!meshRef.current || positions.length === 0) return;
    positions.forEach((p, i) => {
      dummy.position.copy(p).multiplyScalar(1.5);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.count = positions.length;
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Base continuous rotation
      meshRef.current.rotation.y += delta * 0.05;
    }
    
    if (groupRef.current) {
      // Smoothly follow the mouse cursor
      const targetRotX = (state.pointer.y * Math.PI) / 8;
      const targetRotY = (state.pointer.x * Math.PI) / 8;
      
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, -targetRotX, 4, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 4, delta);
      
      // Subtle position shift towards cursor
      const targetPosX = state.pointer.x * 0.3;
      const targetPosY = state.pointer.y * 0.3;
      
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetPosX, 4, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetPosY, 4, delta);
    }
    
    // Smooth color transition
    if (materialRef.current) {
      targetColor.copy(hovered ? hoverColor : baseColor);
      materialRef.current.color.lerp(targetColor, delta * 5);
    }
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const boxSize = isMobile ? 0.03 : 0.022;

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        {/* Invisible hit sphere for optimized raycasting (O(1) instead of O(N) for 15k boxes) */}
        <mesh 
          scale={1.55} 
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          visible={false}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {positions.length > 0 && (
          <instancedMesh 
            ref={meshRef} 
            args={[undefined as any, undefined as any, positions.length]}
            // Removed pointer events from instancedMesh to save massive CPU overhead on mobile
          >
            <boxGeometry args={[boxSize, boxSize, boxSize]} />
            <meshBasicMaterial 
              ref={materialRef}
              color={baseColor} 
              toneMapped={false} 
            />
          </instancedMesh>
        )}
        
        {/* Inner dark core to block stars behind the earth */}
        <mesh scale={1.48}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#030305" />
        </mesh>

        {/* Subtle wireframe for the oceans */}
        <mesh scale={1.481}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#00f3ff" wireframe transparent opacity={0.03} />
        </mesh>
        
        {/* Atmosphere glow */}
        <mesh scale={1.6}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.03} side={THREE.BackSide} toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
};

const Starfield = () => {
  const starsRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.02;
      starsRef.current.rotation.x += delta * 0.005;
    }
  });
  return (
    <group ref={starsRef}>
      <Stars radius={100} depth={50} count={2500} factor={5} saturation={0.5} fade speed={2} />
    </group>
  );
};

const BackgroundScene = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-auto touch-none">
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 1.5]} // Limit device pixel ratio for huge performance boost on mobile
        performance={{ min: 0.5 }} // Allow React Three Fiber to drop resolution if struggling
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} color="#bc13fe" intensity={2} />
        <pointLight position={[10, -10, -5]} color="#00f3ff" intensity={2} />
        <Starfield />
        
        <PixelEarth />
        
        {/* Allow users to freely spin the globe with touch/mouse */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.05}
        />
        
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

const BinaryRain = () => {
  const [columns, setColumns] = useState<number>(0);

  useEffect(() => {
    setColumns(Math.floor(window.innerWidth / 30));
    const handleResize = () => setColumns(Math.floor(window.innerWidth / 30));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 flex justify-between z-0">
      {Array.from({ length: columns }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -1000 }}
          animate={{ y: 1000 }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5
          }}
          className="text-neon-cyan font-mono text-xs whitespace-pre"
          style={{ writingMode: 'vertical-rl' }}
        >
          {Array.from({ length: 40 }).map(() => Math.random() > 0.5 ? '1' : '0').join('')}
        </motion.div>
      ))}
    </div>
  );
};

// --- Project 3D Models ---

const ProjectModel1 = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if(ref.current) {
      ref.current.rotation.x += delta * 0.2;
      ref.current.rotation.y += delta * 0.3;
    }
  });
  return (
    <mesh ref={ref} scale={1.5}>
      <torusKnotGeometry args={[1, 0.2, 128, 16]} />
      <meshStandardMaterial color="#00f3ff" wireframe toneMapped={false} emissive="#00f3ff" emissiveIntensity={0.2} />
    </mesh>
  )
}

const ProjectModel2 = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if(ref.current) {
      ref.current.rotation.y -= delta * 0.4;
      ref.current.rotation.x += delta * 0.1;
    }
  });
  return (
    <group ref={ref} scale={1.5}>
      <mesh>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#bc13fe" wireframe toneMapped={false} emissive="#bc13fe" emissiveIntensity={0.2} />
      </mesh>
      <mesh scale={0.6}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#00f3ff" toneMapped={false} emissive="#00f3ff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

// --- UI Components ---

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent",
        scrolled ? "bg-[#030305]/60 backdrop-blur-xl border-white/5 py-4" : "bg-transparent py-8"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="font-mono text-xl font-bold tracking-tighter flex items-center gap-2">
          <span className="text-neon-cyan">&lt;</span>
          <span className="text-white">Akash</span>
          <span className="text-neon-purple">/&gt;</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          {['Services', 'Process', 'Work', 'Reviews', 'FAQ'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="text-gray-400 hover:text-white transition-colors relative group interactive"
            >
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-neon-cyan transition-all duration-300 group-hover:w-full" />
              {item}
            </a>
          ))}
        </div>
      </div>
    </motion.nav>
  );
};

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden z-10 pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center w-full pointer-events-auto">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-neon-cyan font-mono text-xs uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            System Initialized
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold font-display leading-[1.1] tracking-tighter">
            <span className="block text-gray-400 text-2xl md:text-3xl mb-4 font-mono tracking-normal font-normal">Hi, I'm Akash. I build</span>
            <TextReveal text="Websites That" className="text-white" />
            <br />
            <TextReveal text="Grow Businesses" className="text-gradient" />
          </h1>
          
          <p className="text-xl text-gray-400 max-w-lg leading-relaxed font-light">
            I help businesses and individuals establish a powerful online presence. From custom landing pages to full-scale web applications, I build fast, modern websites that convert visitors into customers.
          </p>
          
          <div className="flex flex-wrap gap-6 pt-4">
            <MagneticButton href="#work" className="px-8 py-4 glass-panel rounded-full font-mono text-sm uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-3 group">
              <Code size={16} className="text-neon-cyan group-hover:rotate-12 transition-transform" />
              View My Work
            </MagneticButton>
            <MagneticButton href="#contact" className="px-8 py-4 border border-white/10 rounded-full font-mono text-sm uppercase tracking-widest hover:border-neon-purple hover:text-neon-purple transition-colors flex items-center gap-3">
              <Terminal size={16} />
              Get a Free Quote
            </MagneticButton>
          </div>
        </motion.div>
      </div>
      
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-500 pointer-events-auto"
      >
        <ChevronDown size={24} />
      </motion.div>
    </section>
  );
};

const Services = () => {
  const services = [
    {
      icon: <Globe size={32} className="text-neon-cyan" />,
      title: "Custom Web Design",
      desc: "Tailored, responsive websites designed to reflect your brand, engage your target audience, and drive conversions."
    },
    {
      icon: <Layout size={32} className="text-neon-purple" />,
      title: "E-Commerce Solutions",
      desc: "Robust online stores optimized for sales, featuring secure checkouts, inventory management, and seamless user experiences."
    },
    {
      icon: <Zap size={32} className="text-white" />,
      title: "SEO & Performance",
      desc: "Lightning-fast websites optimized for search engines to help you rank higher, attract more traffic, and beat the competition."
    }
  ];

  return (
    <section id="services" className="py-32 relative z-10 pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 pointer-events-auto">
        <div className="mb-20 text-center">
          <TextReveal text="What I Offer" className="text-4xl md:text-6xl font-bold font-display mb-6 text-gradient" />
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Digital Solutions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
            >
              <TiltCard>
                <div className="mb-8 p-4 inline-block rounded-2xl bg-white/5 border border-white/10">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold font-display mb-4">{service.title}</h3>
                <p className="text-gray-400 leading-relaxed font-light">{service.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Process = () => {
  const steps = [
    {
      step: "Phase 01",
      title: "Discovery & Strategy",
      desc: "We start by understanding your business goals, target audience, and unique requirements to create a tailored digital strategy."
    },
    {
      step: "Phase 02",
      title: "Design & Development",
      desc: "I create a custom, high-converting design and build your website using modern, fast, and secure web technologies."
    },
    {
      step: "Phase 03",
      title: "Launch & Support",
      desc: "After rigorous testing, we launch your site to the world. I provide ongoing support and maintenance to ensure everything runs smoothly."
    }
  ];

  return (
    <section id="process" className="py-32 relative z-10 bg-black/20 border-y border-white/5 pointer-events-none">
      <div className="max-w-4xl mx-auto px-6 pointer-events-auto">
        <div className="mb-20">
          <TextReveal text="How It Works" className="text-4xl md:text-6xl font-bold font-display mb-6 text-gradient" />
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">The Process</p>
        </div>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-dark-surface text-neon-cyan shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(0,243,255,0.2)] group-hover:scale-110 transition-transform">
                <Briefcase size={16} />
              </div>
              
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)]">
                <TiltCard className="p-6 group-hover:border-neon-cyan/30 transition-colors interactive">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-neon-purple text-xs uppercase tracking-widest">{step.step}</span>
                  </div>
                  <h3 className="font-bold font-display text-xl mb-1">{step.title}</h3>
                  <p className="text-gray-400 font-light text-sm leading-relaxed mt-4">{step.desc}</p>
                </TiltCard>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SourceCode = () => {
  const codeLines = [
    { text: "import { BusinessWebsite } from '@akash/services';", color: "text-neon-purple" },
    { text: "import { SEO, Performance, Conversions } from '@akash/features';", color: "text-neon-purple" },
    { text: "", color: "" },
    { text: "const project = new BusinessWebsite({", color: "text-neon-cyan" },
    { text: "  client: 'Your Amazing Brand',", color: "text-white" },
    { text: "  goal: 'Increase Sales & Leads',", color: "text-white" },
    { text: "  design: 'Modern & Premium',", color: "text-white" },
    { text: "  features: [SEO, Performance, Conversions],", color: "text-green-400" },
    { text: "});", color: "text-neon-cyan" },
    { text: "", color: "" },
    { text: "project.launch().then(() => {", color: "text-neon-purple" },
    { text: "  console.log('Website live. Revenue increasing.');", color: "text-gray-400" },
    { text: "});", color: "text-neon-purple" },
  ];

  return (
    <section id="source" className="py-32 relative z-10 overflow-hidden pointer-events-none">
      <BinaryRain />
      <div className="max-w-4xl mx-auto px-6 relative z-10 pointer-events-auto">
        <div className="mb-20 text-center">
          <TextReveal text="The Blueprint" className="text-4xl md:text-6xl font-bold font-display mb-6 text-gradient" />
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Built For Success</p>
        </div>
        
        <TiltCard className="p-0 overflow-hidden bg-[#0a0a0f]/90 border-white/10 backdrop-blur-2xl">
          <div className="bg-black/50 px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="font-mono text-xs text-gray-500 flex items-center gap-2">
              <TerminalSquare size={14} /> success.config.ts
            </div>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
          <div className="p-6 md:p-8 font-mono text-sm md:text-base overflow-x-auto">
            {codeLines.map((line, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                className="flex gap-4 leading-relaxed whitespace-nowrap"
              >
                <span className="text-gray-600 select-none w-6 text-right">{i + 1}</span>
                <span className={line.color}>{line.text}</span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: codeLines.length * 0.15, duration: 0.1 }}
              className="flex gap-4 mt-2"
            >
              <span className="text-gray-600 select-none w-6 text-right">{codeLines.length + 1}</span>
              <span className="w-2 h-5 bg-neon-cyan animate-pulse inline-block" />
            </motion.div>
          </div>
        </TiltCard>
      </div>
    </section>
  );
};

const Projects = () => {
  const projects = [
    {
      title: "Premium Real Estate",
      category: "Lead Generation",
      tech: ["Next.js", "Tailwind", "SEO", "CMS"],
      model: <ProjectModel1 />
    },
    {
      title: "Modern E-Commerce",
      category: "Online Store",
      tech: ["React", "Stripe", "Three.js", "Analytics"],
      model: <ProjectModel2 />
    }
  ];

  return (
    <section id="work" className="py-32 relative z-10 bg-black/20 border-y border-white/5 pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 pointer-events-auto">
        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <TextReveal text="Recent Client Work" className="text-4xl md:text-6xl font-bold font-display mb-6 text-gradient" />
            <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Success Stories</p>
          </div>
          <MagneticButton className="px-6 py-3 border border-white/10 rounded-full font-mono text-xs uppercase tracking-widest hover:bg-white/5 flex items-center gap-2">
            View All Projects <ArrowRight size={14} />
          </MagneticButton>
        </div>

        <div className="space-y-16">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="group relative"
            >
              {/* Replaced static image with an interactive 3D Canvas */}
              <div className="relative w-full aspect-[4/3] md:aspect-[21/9] rounded-3xl overflow-hidden glass-panel flex flex-col md:flex-row">
                
                {/* 3D Interactive Area */}
                <div className="w-full md:w-1/2 h-full relative cursor-grab active:cursor-grabbing touch-pan-y">
                  <Canvas camera={{ position: [0, 0, 4] }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={1.5} />
                    <pointLight position={[-10, -10, -10]} color="#bc13fe" intensity={2} />
                    {project.model}
                    {/* Restrict vertical rotation so mobile users can still scroll the page */}
                    <OrbitControls 
                      enableZoom={false} 
                      enablePan={false} 
                      autoRotate 
                      autoRotateSpeed={2}
                      minPolarAngle={Math.PI / 2}
                      maxPolarAngle={Math.PI / 2}
                    />
                    <EffectComposer>
                      <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1} />
                    </EffectComposer>
                  </Canvas>
                  
                  {/* Mobile Hint */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/50 font-mono text-xs md:hidden pointer-events-none bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                    <MousePointer2 size={12} /> Swipe to rotate
                  </div>
                </div>

                {/* Content Area */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-gradient-to-t md:bg-gradient-to-l from-[#030305] via-[#030305]/80 to-transparent pointer-events-none">
                  <div className="font-mono text-neon-cyan text-sm mb-4 tracking-widest uppercase">{project.category}</div>
                  <h3 className="text-3xl md:text-5xl font-bold font-display mb-6">{project.title}</h3>
                  <div className="flex flex-wrap gap-3 pointer-events-auto">
                    {project.tech.map(t => (
                      <span key={t} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 font-mono text-xs backdrop-blur-md text-gray-300">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-8 pointer-events-auto">
                    <button className="px-6 py-3 bg-neon-purple/20 border border-neon-purple/50 rounded-full font-mono text-xs uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-colors flex items-center gap-2">
                      Initialize <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const reviews = [
    {
      quote: "Akash completely transformed our online presence. Our sales have doubled since the new website launched.",
      name: "Sarah Jenkins",
      role: "CEO, TechStart",
    },
    {
      quote: "Professional, fast, and incredibly talented. The custom e-commerce solution he built handles our massive inventory flawlessly.",
      name: "Marcus Chen",
      role: "Founder, RetailPro",
    },
    {
      quote: "The attention to detail and focus on SEO brought us to the first page of Google within months. Highly recommended!",
      name: "Emma Watson",
      role: "Marketing Director, GrowthCo",
    }
  ];

  return (
    <section id="reviews" className="py-32 relative z-10 pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 pointer-events-auto">
        <div className="mb-20 text-center">
          <TextReveal text="Client Feedback" className="text-4xl md:text-6xl font-bold font-display mb-6 text-gradient" />
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Word on the street</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.2 }}
            >
              <TiltCard className="h-full flex flex-col justify-between p-8 bg-black/40 border border-white/10 rounded-3xl">
                <div className="mb-8">
                  <MessageSquareQuote size={32} className="text-neon-cyan/50 mb-6" />
                  <p className="text-gray-300 leading-relaxed italic text-lg">"{review.quote}"</p>
                </div>
                <div>
                  <div className="font-bold font-display text-white text-lg">{review.name}</div>
                  <div className="text-neon-purple font-mono text-xs uppercase tracking-widest mt-1">{review.role}</div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    {
      q: "How much does a new website cost?",
      a: "Pricing depends on the scope and complexity of your project. I offer custom quotes based on your specific business needs, ensuring you get the best return on your investment."
    },
    {
      q: "How long does it take to build a website?",
      a: "A standard business website typically takes 2-4 weeks from design to launch. More complex projects, like custom e-commerce stores or web applications, may take longer."
    },
    {
      q: "Do you provide hosting and maintenance?",
      a: "Yes! I offer comprehensive hosting, maintenance, and update packages. You can focus entirely on running your business while I handle all the technical details."
    },
    {
      q: "Will my website be mobile-friendly and SEO optimized?",
      a: "Absolutely. Every website I build is fully responsive (looks great on phones, tablets, and desktops) and follows best practices for Search Engine Optimization to help you rank on Google."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-32 relative z-10 pointer-events-none">
      <div className="max-w-4xl mx-auto px-6 pointer-events-auto">
        <div className="mb-20 text-center">
          <TextReveal text="Query Database" className="text-4xl md:text-6xl font-bold font-display mb-6 text-gradient" />
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Frequently Asked Questions</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "glass-panel rounded-2xl overflow-hidden transition-colors duration-300",
                openIndex === index ? "border-neon-cyan/50 shadow-[0_0_20px_rgba(0,243,255,0.1)]" : "border-white/10 hover:border-white/30"
              )}
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left interactive"
              >
                <span className="font-mono font-bold text-lg pr-8">{faq.q}</span>
                <span className={cn("text-neon-cyan transition-transform duration-300", openIndex === index ? "rotate-180" : "")}>
                  {openIndex === index ? <Minus size={20} /> : <Plus size={20} />}
                </span>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="p-6 pt-0 text-gray-400 font-light leading-relaxed border-t border-white/5 mt-2">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  return (
    <section id="contact" className="py-32 relative z-10 bg-black/40 border-t border-white/5 overflow-hidden pointer-events-none">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-neon-cyan/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel p-12 md:p-24 rounded-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple font-mono text-xs uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
            Available For Projects
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold font-display mb-8">
            Ready to Grow <br/><span className="text-gradient">Your Business?</span>
          </h2>
          
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-12 font-light">
            Whether you need a brand new website or a redesign of your current one, I'm here to help. 
            Let's discuss your goals and how we can achieve them.
          </p>
          
          <MagneticButton href="mailto:sahakash2007777@gmail.com" className="px-10 py-5 bg-white text-black rounded-full font-mono text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-3 mx-auto">
            <Mail size={18} />
            Get Your Free Proposal
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-8 border-t border-white/5 relative z-10 bg-[#030305] pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 pointer-events-auto">
        <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Akash Sah. All systems operational.
        </div>
        <div className="flex items-center gap-8 text-gray-500">
          <MagneticButton href="#" className="hover:text-white transition-colors"><Github size={20} /></MagneticButton>
          <MagneticButton href="#" className="hover:text-white transition-colors"><Linkedin size={20} /></MagneticButton>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-[#030305] text-white font-sans selection:bg-neon-cyan selection:text-black">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-cyan to-neon-purple origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* Custom Cursor */}
      <CustomCursor />

      {/* Global Effects */}
      <div className="scanline" />
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none z-0" />
      
      {/* 3D Background */}
      <BackgroundScene />
      
      {/* Content */}
      <Navbar />
      {/* Added pointer-events-none to main so the background canvas can receive touch/mouse events, 
          and re-enabled pointer-events-auto on the actual content containers inside sections */}
      <main className="pointer-events-none">
        <Hero />
        <Services />
        <Process />
        <SourceCode />
        <Projects />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
