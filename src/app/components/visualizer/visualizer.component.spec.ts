import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { VisualizerComponent } from './visualizer.component';
import { JiraApiService } from '../../services/jira-api.service';
import { JiraParserService } from '../../services/jira-parser.service';
import { VisualizerService } from '../../services/visualizer.service';

describe('VisualizerComponent exports', () => {
  let fixture: ComponentFixture<VisualizerComponent>;
  let component: VisualizerComponent;
  let svg: SVGSVGElement;

  /** Wait until a spy has been called, polling so async browser work (Image load, toBlob) can finish. */
  const whenCalled = (spy: jasmine.Spy) => new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      if (spy.calls.count() > 0) resolve();
      else if (Date.now() - started > 4000) reject(new Error(`${spy.and.identity} was not called`));
      else setTimeout(poll, 20);
    };
    poll();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualizerComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: JiraApiService, useValue: jasmine.createSpyObj('JiraApiService', ['getTickets']) },
        { provide: JiraParserService, useValue: jasmine.createSpyObj('JiraParserService', ['processTicketsFromJson']) },
        { provide: VisualizerService, useValue: jasmine.createSpyObj('VisualizerService', ['visualizeGraph']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VisualizerComponent);
    component = fixture.componentInstance;
    component['hasData'].set(true);
    fixture.detectChanges();

    svg = fixture.nativeElement.querySelector('#graph');
    // Mimic the renderer: it stamps the size the graph was laid out at onto the root element.
    svg.setAttribute('width', '1000');
    svg.setAttribute('height', '600');

    // The user then drags the canvas taller; CSS stretches the svg but the attributes stay stale.
    component.onResizeGraph(900);
    fixture.detectChanges();
    expect(svg.clientHeight).toBe(900);

    // Keep downloads from actually firing in the test browser.
    spyOn(HTMLAnchorElement.prototype, 'click');
  });

  it('exports the SVG at the size currently shown on screen', async () => {
    let exported = '';
    spyOn(XMLSerializer.prototype, 'serializeToString').and.callFake(function (this: XMLSerializer, node: Node) {
      const root = node as Element;
      exported = `${root.getAttribute('width')}x${root.getAttribute('height')}`;
      return '<svg/>';
    });

    component.downloadSvg();

    expect(exported).toBe(`${svg.clientWidth}x${svg.clientHeight}`);
  });

  it('rasterizes the PNG at the size currently shown on screen', async () => {
    const toBlob = spyOn(HTMLCanvasElement.prototype, 'toBlob');

    component.downloadPng();
    await whenCalled(toBlob);

    const canvas = toBlob.calls.mostRecent().object as HTMLCanvasElement;
    expect(canvas.width).toBe(svg.clientWidth);
    expect(canvas.height).toBe(svg.clientHeight);
  });

  it('restores the renderer-stamped size attributes after exporting', () => {
    spyOn(XMLSerializer.prototype, 'serializeToString').and.returnValue('<svg/>');

    component.downloadSvg();

    expect(svg.getAttribute('width')).toBe('1000');
    expect(svg.getAttribute('height')).toBe('600');
  });
});
